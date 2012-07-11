/**
* im.gaoren.com
*/
$(function(){
    function HexToRGB(hex) {
        var hex = parseInt(((hex.indexOf('#') > -1) ? hex.substring(1) : hex), 16);
        return {r: hex >> 16, g: (hex & 0x00FF00) >> 8, b: (hex & 0x0000FF)};
    };
    function getHexOpacity(opacity, color){ //for ie
        var o = parseInt(0xFF * (opacity / 100)).toString(16);
        return '#' + (o.length == 1 ? '0' + o : o ) + color;
    };

    /**
    * 当改变窗口大小时候，内容层贴着左侧窗口移动，保证不能被盖住。
    * 参考值以浏览器中线为参考起点。
    * @return 增加返回对象左侧边相对于浏览器中线的位置
    */
    $.fn.extend({
        'offsets': function(){
            var o = $(this).offset();
            o.center = $appImWin.width() / 2 - o.left; 
            return o;
        }
    });

    var $wallpaper = $('#wallpaper'), $appImBody = $('body'), $appImWin = $(window), $pageLoad = $('#page-loading'), $loadingTip = $('#loading-tip');

    var userStyle = {
        wallpaper: { /* 壁纸设置 */
            'background-image': $wallpaper.css('background-image').replace(/"/g,"").replace(/url\(|\)$/ig, ""),
            'background-color': $wallpaper.css('background-color'),
            'mode': {
                'value': $wallpaper.attr('data-mode') || 'center', //center, or tile, or scale
                /* 以下定义静态内容 */
                o: $('#scale-wallpaper'),
                'center': function(){
                    userStyle.wallpaper.mode.o.hide();
                    return { 'background-repeat': 'no-repeat', 'background-position': '50% 30px'};
                },
                'tile': function(){
                    userStyle.wallpaper.mode.o.hide();
                    return { 'background-repeat': 'repeat', 'background-position': '50% 30px'};
                },
                'scale': function(){
                    var $win = $appImWin, $wallpaperScale = userStyle.wallpaper.mode.o, originScale = 1;
                    $wallpaperScale.jImageLoad({
                        src: userStyle.wallpaper['background-image'],
                        loaded: function($this){
                            $this.show();
                            originScale = $this.width() / $this.height();
                        }
                    });
                    if(! $win.data('wallpaperscale.resize')) {
                        $win.bind('resize.wallpaperscale', function(){
                            var winW = $win.width(), winH = $win.height(), 
                            winScale = winW / winH, size = {}; //需要按图片原来比例缩放;
                            if(winScale < originScale) {
                                size.width = 'auto';
                                size.height = winH;
                            } else {
                                size.width = winW;
                                size.height = 'auto';				
                            };
                            $wallpaperScale.css(size);
                        }).data('wallpaperscale.resize', true);
                    };
                    $win.trigger('resize.wallpaperscale');
                    return {};
                }
            }
        },
        bioPanel: { /* profile panel setting */
            'position': {
                'top': 0,
                'margin-left': 0
            },
            'offset': $('#biography-panel').offsets(),
            'width': 366,
            /* background 使用需要转换为
            * 'background-color': 'rgba(255, 255, 255, 0)', 'background-color-ie': '#7f7e8f7c', //滤镜值
            * */
            'background': { //for save
                'color': '000000',
                'opacity': 70
            },
            'background-view': { //only for view used
                'background-color': 'rgba(255, 255, 255, 0)',
                'filter': 'progid:DXImageTransform.Microsoft.gradient(startColorstr=#7f7e8f7c,endColorstr=#7f7e8f7c)' //滤镜值
            }
        },
        bioText: {
            'avatar': 0,
            'username': {
                "font-family": 'arial',
                "font-size": '20',
                'color': 'ffffff'
            },
            'headline': {  
                "font-family": 'arial',
                "font-size": '20',
                'color': 'ffffff' 
            },
            'biography': {
                "font-family": 'arial',
                "font-size": '20',
                'color': 'ffffff'
            },
            'links': {
                "font-family": 'arial',
                "font-size": '20',
                'color': 'ffffff'
            }
        },
        colors: { //为方便自动化设置的集合方法
            'wallpaper': function(color) {
                userStyle.wallpaper['background-color'] = color;
            },
            'biopanel': function(color) {
                userStyle.bioPanel.background.color = color;
            },
            'username': function(color) {
                userStyle.bioText.username.color = color;
            },
            'headline': function(color) {
                userStyle.bioText.headline.color = color;
            },
            'biography': function(color) {
                userStyle.bioText.biography.color = color;
            },
            'links': function(color) {
                userStyle.bioText.links.color = color;
            }
        }
    };
    var biography = {
        'username': '',
        'headline': '',
        'content': '',
        'links': ''
    };
    /**
    * 全局变量namespace
    */
    var appIm = {};
    /**
    * 保存上述数据url
    * 传参方式：
    * e.g.  参数名 user.bioText.headline.font-family = 'value'
    */
    appIm.saveUrl = '/edit';
    appIm.updateDelay = 3000; //默认3秒
    appIm.updateDelayId = null;
    appIm.param = {};
    appIm.grepObj = function(obj1, obj2){ //简单过滤掉两个对象相同的key:value项目，返回合并两者的项，暂未使用该方法
        for(var key in obj1) {
            if(obj2[key] && obj2[key] === obj1[key]) {
                delete obj1[key];
                delete obj2[key];
            };
            return $.extend(obj1, obj2);
        };
    };
    appIm.msg = {
        oSave: $('#message-save'),
        savedId: null,
        clearSaveId: function(){
            appIm.msg.savedId && clearTimeout(appIm.msg.savedId);
            return appIm.msg;
        },
        saving: function(){
            appIm.msg.clearSaveId().oSave.show().html('<q class="loading"></q>');
        },
        saved: function(){
            appIm.msg.clearSaveId().oSave.show().html('已保存');
            appIm.msg.savedId = setTimeout(function(){
                if( $('#message-save').html() === '已保存' ){
                    appIm.msg.oSave.fadeOut('slow');
                }
            }, appIm.updateDelay);
        }
    };
    /**
    * 过程： 合并param，delay N秒，请求发出，请求期间， 成功后param清空
    * 问题会发生在请求期间，如果出现新的param，会被上一次请求清空，导致第二次的保存失败。
    * 所以解决问题的路径有2：
    * 1、请求发出前解决，
    * 	用临时变量=当前appIm.param，之后立即清空appIm.param。test通过，暂无问题。
    * 2、请求成功后解决。
    *  成功后解决就需要融合新的param与已经发出时候的param，即grepObj()所实现的。已经test可以通过。这是先想出来的方案，但明显
    *  很麻烦。后来想到第一种方案。
    */
    appIm.update = function(param, delay){
        $('#message-save').html('自动保存中...').stop().fadeIn('slow');
        appIm.param = $.extend(appIm.param, param);
        if(appIm.updateDelayId) {
            clearTimeout(appIm.updateDelayId);
        };
        appIm.updateDelayId = setTimeout(function(){
            appIm.msg.saving();
            var paramThread = appIm.param; //这是第一种解决方案
            appIm.param = {};
            $.ajax({
                url: appIm.saveUrl,
                type: 'POST',
                data: paramThread,
                success: function(oy){
                    //appIm.param = appIm.grepObj(oldParam, appIm.param); 这是第二种解决方案
                    appIm.updateDelayId = null;
                    appIm.msg.saved();
                }
            });
        }, delay || appIm.updateDelay);
    };
    /**
    * 实时更新页面显示，通过全局变量
    */
    appIm.view = {
        wallpaper: {
            'o': $('#wallpaper'),
            'background-image': function(){
                var imgSrc = userStyle.wallpaper['background-image'];
                if(imgSrc == 'none') {  //delete image of user and this image is current
                    appIm.view.wallpaper.o.css({
                        'background-image': 'none'
                    });
                } else {
                    appIm.view.wallpaper.o.jImageLoad({
                        src: imgSrc,
                        loading: function($this) {
                            $pageLoad.show();
                            $loadingTip.html('正在读取图片...').show();
                        },
                        loaded: function(){
                            $pageLoad.fadeOut();
                            $loadingTip.fadeOut();
                        }
                    });	

                    appIm.view.wallpaper.mode();
                };
            },
            'background-color': function(){
                appIm.view.wallpaper.o.css({
                    'background-color': '#' + userStyle.wallpaper['background-color']
                });
                appIm.view.wallpaper.mode();
            },
            mode: function(){
                appIm.view.wallpaper.o.css(userStyle.wallpaper.mode[userStyle.wallpaper.mode.value]());		
            }
        },
        bioPanel: {
            o: $('#biography-panel'),
            con: $('#bio-content'),
            position: function(){
                appIm.view.bioPanel.o.css(userStyle.bioPanel.position);
            },
            width: function(){
                appIm.view.bioPanel.con.animate({
                    'width': userStyle.bioPanel.width
                }, 100);
            },
            background: function(){
                var color = userStyle.bioPanel.background.color, opacity = userStyle.bioPanel.background.opacity;
                var rgb = HexToRGB(color), hexOpacity = getHexOpacity(opacity, color);

                var bg = userStyle.bioPanel['background-view'];
                bg['background-color'] = ['rgba(', rgb.r, ',', rgb.g, ',', rgb.b , ',', opacity / 100 , ')'].join('');
                bg['filter'] = 'progid:DXImageTransform.Microsoft.gradient(startColorstr='+ hexOpacity +',endColorstr='+ hexOpacity +')' //滤镜值
                appIm.view.bioPanel.o.css(bg);
            }
        },
        bioText: {
            o: {
                'avatar': $('#bio-avatar'),
                'username': $('#bio-username'),
                'headline': $('#bio-headline'),
                'biography': $('#bio-content'),
                'links': $('#links a')
            },
            'avatar': function(){
                appIm.view.bioText.o.avatar.toggle(userStyle.bioText.avatar);
            }
        },
        biography: {
            'username': function(){
                appIm.view.bioText.o.username.html(biography.username);
            },
            'headline': function(){
                appIm.view.bioText.o.headline.html(biography.headline);
            },
            'content': function(){
                appIm.view.bioText.o.biography.html(biography.content);
            }
        },
        colors: { //为方便自动化设置的集合方法
            'wallpaper': function() {
                appIm.view.wallpaper['background-color']();
            },
            'biopanel': function() {
                appIm.view.bioPanel.background();
            }
        }
    };

    /**
    * 数据保存方法，通过全局变量存取值
    */
    appIm.save = {
        wallpaper: {
            'background-image': function(){
                var param = {'userStyle.wallpaper.background-image': userStyle.wallpaper['background-image']};
                appIm.update(param);
            },
            'background-color': function(){
                var param = {'userStyle.wallpaper.background-color': userStyle.wallpaper['background-color']};
                appIm.update(param);
            },
            mode: function(){
                var param = {'userStyle.wallpaper.mode.value': userStyle.wallpaper.mode.value}
                appIm.update(param);
            }
        },
        bioPanel: {
            o: $('#biography-panel'),
            position: function(){
                var param = {
                    'userStyle.bioPanel.position.top': userStyle.bioPanel.position.top,
                    'userStyle.bioPanel.position.margin-left': userStyle.bioPanel.position['margin-left']
                };
                appIm.update(param);
            },
            background: function(){
                var param = {
                    'userStyle.bioPanel.background.color': userStyle.bioPanel.background.color,
                    'userStyle.bioPanel.background.opacity': userStyle.bioPanel.background.opacity	
                };
                appIm.update(param);
            }
        },
        bioText: {
            o: {
                'bio-header': $('#bio-header')
            },
            'avatar': function(){
                var param = {
                    'userStyle.bioText.avatar': ~~userStyle.bioText.avatar
                };
                appIm.update(param);
            }
        },
        biography: {
            'username': function(){
                var param = {
                    'biography.username': biography.username,
                    'userStyle.bioPanel.width': userStyle.bioPanel.width
                };
                appIm.update(param);
            },
            'headline': function(){
                var param = {
                    'biography.headline': biography.headline,
                    'userStyle.bioPanel.width': userStyle.bioPanel.width
                };
                appIm.update(param);
            },
            'content': function(){
                var param = {
                    'biography.content': biography.content
                };
                appIm.update(param);
            }
        },
        colors: { //为方便自动化设置的集合方法
            'wallpaper': function() {
                appIm.save.wallpaper['background-color']();
            },
            'biopanel': function() {
                appIm.save.bioPanel.background();
            }
        }
    };
    /**
    * 按照规律编写的循环赋值，简化代码量，主要用于设置字体，大小，颜色
    */
    var bioTextSets = ['username', 'headline', 'biography', 'links'], properties = ['font-family', 'font-size', 'color'];
    for(var key in bioTextSets) { //批量定义方法。
        var setsName = bioTextSets[key];
        appIm.view.bioText[setsName] = {};
        appIm.save.bioText[setsName] = {};
        for(var key in properties) { //字体，字大小，颜色设置方法
            var property = properties[key];

            appIm.view.bioText[setsName][property] = (function(name, prop){
                return function(){
                    var style = {}, value = userStyle.bioText[name][prop];
                    if(prop == 'color') {
                        value = '#' + value;
                    } else if(prop == 'font-size'){
                        value = value + 'px';
                    };
                    style[prop] = value;
                    appIm.view.bioText.o[name].css(style);
                };
            })(setsName, property);

            appIm.save.bioText[setsName][property] = (function(name, prop){
                return function(){
                    var param = {}, key = 'userStyle.bioText.' + name + '.' + prop;
                    param[key] = userStyle.bioText[name][prop];
                    appIm.update(param);
                };
            })(setsName, property);
        };

        //add items to colors
        appIm.view.colors[setsName] = (function(name){
            return function(){
                appIm.view.bioText[name].color();
            };
        })(setsName);

        appIm.save.colors[setsName] = (function(name){
            return function(){
                appIm.save.bioText[name].color();
            };
        })(setsName);
    };

    /**
    *  top-bar 
    *  下拉， 编辑切换
    */
    function toggleCustomize(){
        var $editBtn = $('#toggle-customize').toggleClass('button-editing');
        var $customPanel = $('#customize-panel').toggle();
    };
    function imShare() {
        //$("#share-loading").show();
        //$('#share-wrap').hide();
        //$.get('/im/generateThumb', function( ret ){
            //if ( typeof initShareToSina === 'function' ){
                //initShareToSina( ret.isSuccess ? ret.thumb : '' );
            //}
            //$("#share-loading").hide();
            //$('#share-wrap').show();
        //});
    };

    $('#header').delegateFor('click', {
        '.menu': function(e){
            $(this).children('.menu-content').toggle();
            if($(e.target).is('#share-trigger')) {
                //$('.sharebox-sns').show().css( {'opacity': 0.8, 'background-color': 'black' } );
            };
        },
        '#toggle-customize': function(){
            toggleCustomize();
            return 0;
        }
    }).delegate('.menu', 'mouseleave', function(){
        $(this).children('.menu-content').hide();
    });
    $('#im-share-trigger').click(function(){
        $('#share-trigger').trigger('click');
    });
    /**
    * init something
    */
    if($wallpaper.attr('data-load-src') != 'none') {
        $wallpaper.jImageLoad({
            loading: function($this) {
                $pageLoad.show();
                $loadingTip.html('正在读取图片...').show();
            },
            loaded: function($this, success, $img){
                $pageLoad.fadeOut();
                $loadingTip.fadeOut();
                if ( userStyle.wallpaper.mode.value === 'center' ){
                    $('body').append($img.hide());
                    $('body').css('height', $img.height() > $( window ).height() ? $img.height() : $( window ).height() );
                } else {
                    $('body').css({'height': $(window).height(), 'overflow': 'hidden'});
                }
            }
        });
    }
    userStyle.bioPanel.background.color = initBackgroundColor.substring( 2, 8 );
    setTimeout(function(){
        appIm.view.wallpaper.mode();
        $appImWin.trigger( 'resize.wallpaperscale' );
    },100);

    /**
    * dashboard control
    * tab切换
    * 背景图设置
    * 档案内容
    * 颜色
    * 字体
    * 拖动
    */
    $('#customize-panel').jTabSimple({
        tab: '.tab-item',
        con: '.customize-pane',
        curr: 'active'
    }).delegateFor('click', {
        '.customize-close': function(){ //编辑自定义面板
            toggleCustomize();
        },
        '.thumb-wrap': function(){ //设置壁纸图片
            var curr = 'thumb-wrap-curr', $item = $(this).parent();
            if($item.hasClass(curr))
                return false;
            $("#wallpaper-res li.thumb-wrap-curr").removeClass(curr);
            $item.addClass(curr);
            var imgSrc = $(this).attr('href');
            /* 三步执行： 1、更新值； 2、更新视图； 3、保存数据 */
            userStyle.wallpaper['background-image'] = imgSrc; 
            appIm.view.wallpaper['background-image']();
            appIm.save.wallpaper['background-image']();
            return false;
        },
        '.scaled-area a': function() { //选择壁纸缩放类型
            var selected = 'radio-selected';
            if(! $(this).hasClass(selected)) {
                $(this).siblings('a').removeClass(selected).end().addClass(selected);
                /* 三步执行： 1、更新值； 2、更新视图； 3、保存数据 */
                userStyle.wallpaper.mode.value = $(this).attr('type');
                appIm.view.wallpaper.mode();
                appIm.save.wallpaper.mode();
            };
            return false;
        },
        '.remove-thumb': function(){ //删除已上传的背景
            var $this = $(this), $item = $this.closest('li'), $confirm = $item.children('.remove-confirm').show();
            return false;
        },
        '.button-confirm': function(){ //删除已上传的背景
            var $this = $(this);
            if($this.attr('data-action') == 'ok') {
                var $item = $this.closest('li'), id = $item.attr('data-id');
                $.get('/im/deleteBg', {'id': id}, function(){
                    if($item.hasClass('thumb-wrap-curr')) {
                        userStyle.wallpaper['background-image'] = 'none';
                        appIm.view.wallpaper['background-image']();
                        appIm.save.wallpaper['background-image']();
                    };
                    $item.remove();
                });
            };
            $this.closest('.remove-confirm').hide();

            return false;
        },
        '#layout-guides': function(){ //显示隐藏参考线
            var visible = $(this).hasClass('showing').toString(),
            txt = {
                'true': '显示布局参考线',
                'false':'隐藏布局参考线'
            };
            $(this).toggleClass('showing').html(txt[visible]);
            $('p.layout-line').toggle();
        }		
    }).drag(function( ev, dd ){  //拖动自定义面板
        var maxPos = {
            top: 30,
            left: $appImBody.innerWidth() - $(this).outerWidth()
        };
        $( this ).css({
            top: Math.max(maxPos.top, Math.min(dd.offsetY, 1050) ),
            left: Math.max(0, Math.min(maxPos.left, dd.offsetX) )
        });
    },{ handle:'.design_dragger' });

    /* biography events */
    $('#biography-panel').drag('start', function(ev, dd) {
        dd.originX = dd.offsetX;  //保存原始位置，便于计算偏移量，设置margin-left
        dd.originML = parseInt($(this).css('margin-left'));
    }).drag(function( ev, dd ){ //拖动简介面板，修改的是margin-left值，这点需要注意
        var bodyW = $appImBody.innerWidth(), maxPos = {
            top: 30,
            'margin-left': bodyW / 2 - $(this).outerWidth()
        },
        newPos = {
            top: Math.max(maxPos.top, Math.min(dd.offsetY, 620) ),
            'margin-left': Math.max(0 - bodyW / 2, Math.min(maxPos['margin-left'], dd.offsetX - dd.originX + dd.originML) )
        };

        $( this ).css(newPos);
    },{ handle:'#profile_dragger'}).drag('end', function(ev, dd){
        var endPos = {
            top: parseInt($(this).css('top')),
            'margin-left': parseInt($(this).css('margin-left'))
        };    	
        userStyle.bioPanel.position = endPos;
        userStyle.bioPanel.offset = appIm.view.bioPanel.o.offsets();

        appIm.view.bioPanel.position();
        appIm.save.bioPanel.position();
    });

    /* 内容更新 */
    $("#avatar-toggle").change(function(){
        userStyle.bioText.avatar = $(this).attr('checked');
        appIm.view.bioText.avatar();
        appIm.save.bioText.avatar();
    });
    $('input.bio-text').bind('textchange', function(){
        var value = $(this).val(), name = $(this).attr('name');

        biography[name] = value;
        appIm.view.biography[name]();

        userStyle.bioPanel.width = parseInt(appIm.save.bioText.o['bio-header'].width());
        appIm.view.bioPanel.width();

        appIm.save.biography[name]();
    });
    $.getScript('/js/tiny_mce/jquery.tinymce.js', function(){
        var editor = jQuery('textarea.editor');
        editor.tinymce({
            script_url : '/js/tiny_mce/tiny_mce.js',
            theme : "advanced",
            mode : "textareas",
            language : 'zh-cn',
            elements : "content,excerpt",
            convert_urls : false,
            verify_css_classes : true,
            width:520,
            height:200,
            content_css : "/js/tiny_mce/editor-content.css",
            plugins : "media,inlinepopups,paste",
            paste_auto_cleanup_on_paste : true,
            paste_remove_styles: true,
            theme_advanced_buttons1 : 'bold,italic,underline,|,justifyleft,justifycenter,justifyright,|,bullist,numlist,|,link,unlink',
            theme_advanced_buttons2 : '',
            theme_advanced_buttons3 : '',
            remove_linebreaks : false,
            theme_advanced_toolbar_location : "top",
            theme_advanced_toolbar_align : "left",
            theme_advanced_resizing : false, //不显示拖到改变编辑区域大小
            theme_advanced_resize_horizontal : false,
        paste_text_sticky_default: false,

            setup: function(ed){
                var $tipCount = $("#tip-bio-content-count"), init = true;
                var originCon = editor.val();
                var update_bio = function(e) {
                    var content = ed.getContent(), length = content.length, text_length = 0, maxLength = 3000;
                    if (length>0) {
                        text_length = length - 7;
                    } else {
                        text_length = 0;
                    };
                    if(! init) {
                        if ( text_length > maxLength) {
                            $tipCount.css({
                                'color': 'red'
                            }).html( text_length + " 个字 (包含格式化)，超出最大"+ maxLength + "个字数限制，多余文字将被截断。");
                            init = 0;
                        } else {
                            $tipCount.css({
                                'color': '#000'
                            }).html( text_length + " 个字 (包含格式化)");

                            if(originCon != content) {
                                biography.content = content;
                                appIm.view.biography.content();
                                appIm.save.biography.content();

                                originCon = content;
                            };
                        };
                    };
                    init = false;
                };
                ed.onKeyUp.add( update_bio );
                ed.onChange.add( update_bio );
            }
        });
    });

    /* bg image upload , slider */
    var sliderParam = {
        circular: 0,
        scroll: 3,
        itemWidth: 166,
        itemHeight: 136
    };
    var $savedBg = $('#saved-bg-wrap').jCarouselLite($.extend({
        btnPrev: '#bg_saved_prev',
        btnNext: '#bg_saved_next'
    }, sliderParam));
    $('#store-bg-wrap').jCarouselLite($.extend({
        btnPrev: '#bg_store_prev',
        btnNext: '#bg_store_next'
    }, sliderParam));

    var $bgUploader = $('#bg-uploader'), $bgUploading = $('#bg-uploading');
    if ( $('#customize-panel')[ 0 ] ){
        $.getScript('/js/base/fileuploader.js', function(){
            new qq.FileUploader({
                element: $bgUploader[0],
                action: '/im/uploadBg',
                params: {
                    action: 'preview',
                    _: Math.random()
                },
                multiple: false,
                allowedExtensions: ['jpg', 'jpeg', 'png', 'gif'],
                sizeLimit: 5 * 1024 * 1024,
                template: '<div class="qq-uploader">' + 
                    '<div class="qq-upload-drop-area"><span>拖动文件到这里上传</span></div>' +
                    '<div class="qq-upload-button button png"><q>上传壁纸图片</q></div>' +
                    '<ul id="bg-upload-list" class="qq-upload-list"></ul>' + 
                    '</div>',
                fileTemplate: ['<li style="height:20px;margin:0 0 10x"><span class="l-f">正在上传文件</span> ',
                    '<span class="qq-upload-file l-f" style="margin:0 10px 0 0"></span>',
                    '<span id="original-spinner" class="qq-upload-spinner l-f"></span>',
                    '<span class="upload-bar"></span>',
                    '<span class="qq-upload-size l-f"></span>',
                    '<a class="qq-upload-cancel" href="#"></a>',
                    '<span class="qq-upload-failed-text"></span>',
                    '</li>'].join(''),
                    processList: $("#bg-upload-list")[0],
                    onSubmit: function(id, fileName){
                        $bgUploader.hide();
                        $bgUploading.show();
                    },
                    onComplete: function(id, fileName, responseJson){
                        $bgUploader.show();
                        $bgUploading.hide();
                        if(responseJson.isSuccess) {
                            //更新slider
                            var item = ['<li data-id="', responseJson.id , '" class="thumb-wrap-curr">' ,
                                '<a class="thumb-wrap" href="', responseJson.image ,'"><img src="',responseJson.thumb,'" alt=""/> \
                                    <span class="remove-thumb">删除</span> \
                                    </a> \
                                    <div class="remove-confirm"> \
                                    <p class="confirmtext">删除图片?</p> \
                                    <p class="buttons clearfix"><span class="button"><span class="button-content button-confirm" data-action="ok">确定</span></span><span class="button button_styleb"><span data-action="cancel" class="button-content button-confirm">取消</span></span></p> \
                                    </div> \
                                    </li>'].join('');
                                $('#saved-bg-wrap li.thumb-wrap-curr').removeClass('thumb-wrap-curr');
                                $('#saved-bg-wrap ul').prepend(item);
                                $savedBg.jCarouselLite($.extend({
                                    btnPrev: '#bg_saved_prev',
                                    btnNext: '#bg_saved_next'
                                }, sliderParam));
                                //更新视图
                                userStyle.wallpaper['background-image'] = responseJson.image;
                                appIm.view.wallpaper['background-image']();
                        };
                    }
            });
        });
    }

    /* color */
    $.getScript('/js/jq/colorpicker.js', function(){
        $('a.colorwell').ColorPicker({
            onBeforeShow: function(){
                $(this).ColorPickerSetColor($(this).attr('media'));
            },
            onSubmit: function(hsb, hex, rgb, el){
                $(el).css({
                    'background-color': '#' + hex
                }).attr('media', hex).ColorPickerHide();
                var type = $(el).attr('type');

                userStyle.colors[type](hex);
                appIm.view.colors[type]();
                appIm.save.colors[type]();
            }
        });
    });

    /* opacity slider */
    $.getScript('/js/jq/jquery.dependClass.js', function(){
        $.getScript('/js/jq/jquery.slider.js', function(){
            $("#opacity-slider").slider({
                from: 0,
                to: 100,
                step: 1,
                callback: function(value){
                    userStyle.bioPanel.background.opacity = value;
                    appIm.view.bioPanel.background();
                    appIm.save.bioPanel.background();
                }
            });
        });
    });

    /* fonts */
    $("div.select-wrap").jSelect({
        attr: 'type',
        show: '.ddTitle',
        con: '.select-options',
        curr: 'curr-select',
        onchange: function(v, index, $items){
            var type = $items.eq(index).closest('li').attr('data-target');
            userStyle.bioText[type]['font-family'] = v;
            appIm.view.bioText[type]['font-family']();
            appIm.save.bioText[type]['font-family']();
        }
    });
    $('#fonts-set-list').delegate('.size-crease', 'click', function(){
        var type = $(this).closest('li').attr('data-target'), action = $(this).attr('data-action'),
        $show = $(this).siblings('.font-size').children('.size-show'), currSize = $show.html();
        currSize = action == 'decrease' ? --currSize : ++currSize;
        $show.html(currSize);

        userStyle.bioText[type]['font-size'] = currSize;
        appIm.view.bioText[type]['font-size']();
        appIm.save.bioText[type]['font-size']();
    });

    /* other */
    $(".addservicebutton").fancybox({
        'opacity'		: true,
        'overlayShow'	: false,
        'transitionIn'	: 'fade',
        'transitionOut'	: 'fade',
        'content' : $('.addservices').show()
    });
    /* 保持bioPanel在窗口大小改变时候位于视线内 */
    $appImWin.bind('resize.keep-bio-show', function(){
        var $bp = appIm.view.bioPanel.o, currOffset = $bp.offsets();
        if(currOffset.left <= 12 ) {
            $bp.css({
                'left': 10 - parseInt($bp.css('margin-left'))
            });	
            if(currOffset.center > userStyle.bioPanel.offset.center) {
                $bp.css({
                    'left': '50%'
                });
            };
        };
    }).trigger('resize.keep-bio-show');

    //分享窗口关闭按钮绑定
    $('.sharebox-sns .closebtn').click(function(){
        $( this ).parent().hide('fast');
    });
    //绑定窗口
    $('.addservices .closebtn').click(function(){
        $('#fancybox-content').hide('fast');
    });
    //分享窗口渐入
    $('.sharebox-sns').jFixed({
        'bottom': 0,
        'right': $('.sharebox-sns .sharebtn-wrap')[ 0 ] ? 50 : 460
    });
    $('.guest-sharebox').jFixed({
        'bottom': 0,
        'right': 50
    });
    $('.match-box').jFixed({
        'bottom': 0,
        'right': 460
    });
    setTimeout(function(){
        var sharebox = $('.sharebox-sns');
        var guest_sharebox = $('.guest-sharebox');
        var match_box = $('.match-box');
        if ( guest_sharebox[ 0 ] ){
            sharebox = $.merge( sharebox, guest_sharebox );
        } else {
            //sharebox = $.merge( sharebox, match_box );
        }
        if ( match_box.length && !first_time ){
            match_box.css('height', 0).show().css('opacity', '0.9' );
            match_box.animate( { 'height':  100 }, 500);
        }
        sharebox.css('height', 0).show();
        sharebox.animate( { 'height':  100 }, 500, function(){
            setTimeout(function(){
                sharebox.animate( { 'height':  30 }, 500 );
            }, 2000);
        } );
    }, 2000);
    $.merge(  $('.sharebox-sns'), $('.guest-sharebox')  ).mouseenter(function(){
        $( this ).stop().animate({ 'height':  100}, 500);
    });
    $.merge(  $('.sharebox-sns'), $('.guest-sharebox')  ).mouseleave(function(){
        $( this ).stop().animate({ 'height': 30}, 500);
    }).css('opacity', '0.9' );

    //分享按钮绑定
    $('.sharebox-sns .share-btn').click(function(){
        $(this).parent().find('p').html('正在发送分享...');
        var _self = this;
        var post_url = $( this ).attr('href');
        $.ajax({
            url: post_url,
            type: 'POST',
            success: function( ret ){
                var button = $( _self );
                if( ret.isSuccess ){
                    //$( _self ).prev().html('分享成功！');
                    var tip = button.parent().find('p');
                    tip.html('分享成功！');
                    setTimeout(function(){
                        tip.html('继续分享到');
                    }, 2000);
                    var wrap = button.closest('.sharebtn-wrap');
                    button.remove();
                    if ( wrap.find('a').length === 0 ){
                        setTimeout(function(){
                            $('.sharebox-sns').hide('slow');
                        }, 1000);
                    }
                } else {
                    button.prev().html('由于网络问题分享失败，请稍后重试！');
                }
            }
        });
        return false;
    });
    //global-tip
    var globalTip = function( content, fadeTime ){
        $('p.global-tip').fadeIn('slow').find('span').html( content );
        setTimeout( function(){
            $('p.global-tip').fadeOut('slow');
        }, fadeTime);
    };
    //收藏按钮绑定
    $('.fav-btn').click(function(){
        if ( !$(this).hasClass('fav-added') ){
            $.ajax({
                url: '/im/addfav',
                type: 'POST',
                data: { 'domain': $(this).attr('domain') },
                success: function( ret ){
                    if ( ret.isSuccess ){
                        $('p.global-tip').fadeIn('slow').find('span').html( '添加收藏成功！' );
                        setTimeout( function(){
                            $('p.global-tip').fadeOut('slow');
                        }, 3000);
                        $('.fav-btn').addClass('fav-added');
                        $('.fav-btn .icon-fav').css('background-position', '0 -20px');
                    }
                }
            });
        } else {
            $.ajax({
                url: '/im/removefav',
                type: 'POST',
                data: { 'domain': $(this).attr('domain') },
                success: function( ret ){
                    if ( ret.isSuccess ){
                        $('p.global-tip').fadeIn('slow').find('span').html( '删除收藏成功！' );
                        setTimeout( function(){
                            $('p.global-tip').fadeOut('slow');
                        }, 3000);
                        $('.fav-btn').removeClass('fav-added');
                        $('.fav-btn .icon-fav').css('background-position', '0 0');
                    }
                }
            });
        }
    });
    //解除收藏
    $('.fav-items li').mouseenter(function(){
        $(this).find('.remove-fav').show();
    });
    $('.fav-items li').mouseleave(function(){
        $(this).find('.remove-fav').hide();
    });
    $('.remove-fav').click(function(){
        var li = $( this ).closest('li');
        $.ajax({
            url: '/im/removefav',
            type: 'POST',
            data: { 'domain': $( this ).prev().html() },
            success: function( ret ){
                if ( ret.isSuccess ){
                    $('p.global-tip').fadeIn('slow').find('span').html( '删除收藏成功！' );
                    setTimeout( function(){
                        $('p.global-tip').fadeOut('slow');
                    }, 3000);
                    li.remove();
                }
            }
        });
    });
    if( $('.match-tip').length > 0 && !$('.match-tip ul').hasClass('participated') ){
        $('.match-tip ul a').click(function(){
            var self = this;
            $.ajax({
                url: '/im/addmatch',
                type: 'POST',
                data: { 'match_name': $( this ).attr('data-name') },
                success: function( ret ){
                    if ( ret.isSuccess ){
                        globalTip( '参加比赛成功！', 3000 );
                        $( self ).addClass('joined-this');
                        $( self ).closest('ul').addClass('participated');
                        $('.match-tip ul a').unbind();
                    }
                }
            });
        });
    }

    //统计
    if ( !is_self ){
        $('#links a').click(function(){
            $.ajax({
                url: '/im/recordoauthclick',
                type: 'POST',
                data: { 'links': $( this ).attr('links'), 'domain': domain ? domain : '' },
                success: function( ret ){ }
            });
        });
    }
    ( $('.guest-sharebox').length ? $('.guest-sharebox a') : $('.sharebox-sns a') ).click(function(){
        if ( /shareTo/.test( $( this ).attr('href') ) ){
            $.ajax({
                url: '/im/recordshareclick',
                type: 'POST',
                success: function( ret ){ }
            });
        }
    });
    //delete sns service
    $('.oauthlist span.delete-sns').click(function(){
        var self = this;
        $.ajax({
            url: '/im/removesns',
            type: 'POST',
            data: { 'oauthtype': $( self ).attr('oauthtype') },
            success: function( ret ){
                if ( ret.isSuccess ){
                    $( self ).parent().fadeOut('slow');
                    $('.j-default').each(function(){
                        if( new RegExp( $( self ).attr('oauthtype') ).test( this.value ) ){
                            $( this ).val('');
                            $( this ).parent().next().find('input').val('');
                        }
                    });
                    $('.save-links').click();
                }
            }
        });
    });

    //tag function
    $('.tag-input').click(function(){
        $( this ).find('input').focus();
    });
    
    $('.tag-input input').keyup(function(e){
        var tag = $.trim( $( this ).val() );
        if ( /[^;；]+[;；]/.test( tag ) ){
            tag = $.trim( tag.replace(/;/g,'').replace(/；/g,'') );
            if ( tag ){
                $('<div class="single-tag"><span>' + tag + '</span><a href="javascript:;">X</a></div>').insertBefore( this );
                $( this ).val('');
                var tags = [];
                $('.single-tag').each(function(){
                    tags.push( $.trim( $( this ).find('span').text() ) );
                });
                appIm.update( { 'tags': tags } );
            }
        }
    });
    $('.single-tag a').click(function(){
        $( this ).closest('.single-tag').remove();
        var tags = [];
        $('.single-tag').each(function(){
            tags.push( $.trim( $( this ).find('span').text() ) );
        });
        appIm.update( { 'tags': tags } );
    });

    //intro-tip
    var introTipFn = function(){
        var _pos, _content, _clickObj, _afterClick;
        return {
            'generate': function( pos, content, clickObj, afterClick ){
                _pos = pos; _content = content; _clickObj = clickObj; _afterClick; 

                //$('.intro-tip').css( { 'top': pos.top + 10, 'left': pos.left, 'opacity': 0 } ).show();
                //$('.intro-tip').animate( { 'top': pos.top, 'left': pos.left, 'opacity': 0.8 }, 300 );
                $('.intro-tip .intro-content').html( content );
                var clickFn = function(){
                    afterClick.call(this);
                    $( this ).unbind( 'click', clickFn );
                    //$('.intro-tip').css( { 'top': pos.top , 'left': pos.left } );
                    //$('.intro-tip').animate( { 'top': pos.top + 20, 'left': pos.left, 'opacity': 0 }, 300 );
                };
                $( clickObj ).click(clickFn);
            },
            'fadeIn': function( posbind ){
                var posbind = posbind ? posbind : false;
                var introtip = $('.intro-tip');
                introtip.css( { 'top': _pos.top + 10, 'left': _pos.left, 'opacity': 0 } ).show();
                introtip.animate( { 'top': _pos.top, 'left': _pos.left, 'opacity': 0.8 }, 300 ,function(){
                    introtip.fadeOut('slow', function(){
                        introtip.fadeIn('slow',function(){
                            introtip.fadeOut('slow',function(){
                                introtip.fadeIn('slow');

                                if( posbind ){
                                    var move = function(){
                                        introtip.css( { 'top': _clickObj.offset().top + 10, 'left': _clickObj.offset().left } );
                                        setTimeout(function(){
                                            move();
                                        }, 200);
                                    }
                                    move();
                                }
                            });
                        });
                    });
                });
            },
            'fadeOut': function(){
                var introtip = $('.intro-tip');
                introtip.css( { 'top': _pos.top , 'left': _pos.left } );
                introtip.animate( { 'top': _pos.top + 20, 'left': _pos.left, 'opacity': 0 }, 300 );
            }
        };
    }();

    //introduction
    var introGuide = function(){
        $('.sharebox-sns').css({'opacity': 0, 'z-index': -100 });
        $('.match-box').css({'opacity': 0, 'z-index': -100});
        setTimeout(function(){
            var pic_content = '用你的真实照片作为主页背景吧，充满自信的面对世界！',
            edit_content = '向大家介绍一下自己吧！',
            sns_content = '<p style="font-size:16px;text-align: center">非常重要！</p>添加绑定你的其他网络应用帐号，方便朋友间各种沟通！',
            link_content = '添加社交网络之外与你相关的网址， 如“媒体对我的报道”';
            introTipFn.generate( { 'top': $('.qq-upload-button').offset().top + 22, 'left': $('.qq-upload-button').offset().left + 26 }, pic_content, $('.qq-upload-button'), function(){ 
                introTipFn.fadeOut();
                setTimeout(function(){
                    introTipFn.generate( { 'top': $('a[href=#biography]').offset().top + 10, 'left': $('a[href=#biography]').offset().left + 8 }, edit_content, $('a[href=#biography]'), function(){ 
                        introTipFn.fadeOut();
                        var show_sns_intro = function(){
                            $('#mce_0_tbl').unbind('mouseleave', show_sns_intro);

                            introTipFn.generate( { 'top': $('#btn-addservices').offset().top + 13, 'left': $('#btn-addservices').offset().left }, sns_content, $('#btn-addservices'), function(){ 
                                introTipFn.fadeOut();

                            });
                            introTipFn.fadeIn( true );
                        };

                        $('#mce_0_tbl').mouseleave(show_sns_intro);
                    });
                    introTipFn.fadeIn();
                }, 10000);
            });
            introTipFn.fadeIn();

        }, 1000);
    };

    if ( first_time ){
        introGuide();
    }
    $.getScript('http://v2.jiathis.com/code/jia.js?uid=1537386');
});
