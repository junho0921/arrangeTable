/*
     _ _      _       _
 ___| (_) ___| | __  (_)___
/ __| | |/ __| |/ /  | / __|
\__ \ | | (__|   < _ | \__ \
|___/_|_|\___|_|\_(_)/ |___/
                   |__/

 Version: 1.5.8
  Author: Ken Wheeler
 Website: http://kenwheeler.github.io
    Docs: http://kenwheeler.github.io/slick
    Repo: http://github.com/kenwheeler/slick
  Issues: http://github.com/kenwheeler/slick/issues

 */
/* global window, document, define, jQuery, setInterval, clearInterval */

/*
* jun注释:  slide为切换, numOfSlides切换总数, $slides为单元
*
* 结构:
* _.$slider('.slick-slider') > _.$list('.slick-list') > _.$slideTrack('.slick-track') > _.$sliders('.slick-slide')[不包含cloned的]
*
* 关于滚动的参数:
* 1, _.slideCount = _.$slides.length滚动单元数量  不含cloned的;
* 2, _.slideWidth子项宽度,高度自由;
* 3, _.listWidth & _.listHeight窗口尺寸
* 4, _.currentSlide当前子项意义? cloned不可能是currentSlide
* 5, _.slideOffset来自方法.getLeft
* 6, cloned的数量普通情况是slideToShow * 2
* 7, _.touchObject触控数据保存值, 包括: touchObject.curX&curY当前点; touchObject.startX起始点; touchObject.swipeLength拉动距;touchObject.minSwipe触发切换的临界值
* 8, _.swipeDirection拉动方向
*
* 注意点:
* 1, 滚动切换(无论是触控,手动,自动)的个数都是以slidestoscroll为准, 除了特殊情况: 当slidesToscroll = slidesToshow时
* 2, slidesToscroll = slidesToshow的情况(是否无限循环都一样)是在最后一轮[end]必定靠右, 所以最后一轮的scroll滚动数是1或小于slidesToscroll, 而currentslide继续累加slidesToscroll, 所以比一定靠左
* 3, 触控滑动只是模仿按钮效果! 不是根据触控来动态切换.
* 4, 居中模式centerMode+循环模式有slick-active,而
*    centerMode非循环模式中则没有slick-active,且显示的个数有所变化=slideToShow*2-1个
* 5, 非循环模式都没有cloned的,
* 6, lazyload是有动画效果的
* 7,
* 8, variableWidth=true即子项宽度自由(不设平均宽)而$slideTrack的长度=5000 * _.slideCount等于无限长,缺点是加载的图片数量还是由slideToShow决定, 居中模式很好玩!
* 9, 垂直方向时, $list与$slideTrack的高度都以$slides.first().outerHeight(true)为基础
* 10,自适应高度是在条件 :_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false
* 11,子项第一个的尺寸是参考点, 搜索_.$slides.first().
* 12,尺寸调整时会取整, 最后, 窗口与子项的比例不是整数
* 13,slidesToScroll 与 slideToshow的关系: slideToshow决定指示灯的数量&加载的图片数量, slidesToScroll决定最后一轮与最后的currentslide
* 14,自动播放是一个不断setInterval与clearInterval的过程
* 15,
* 16
*
*
*模式:
* 居中 && 循环
* 循环居中模式, 循环不居中模式, 居中不循环模式, 不居中不循环模式
* 不循环模式的自动播放一般都可以一直来回方向播放, 但不居中不循环模式还没有完善, 没有sroll与show与slideCount配合好的话不能一直来回.
*
* 垂直(循环居中模式, 循环不居中模式, 居中不循环模式, 不居中不循环模式)
*
* 自由宽度(重点在于计算targetLeft(offset) = targetSlide[0].offsetLeft)
*
*
* fade模式:
* fade模式只显示一个子项, 建议只在slidesToShow=slidesToScroll=1的情况使用, fade模式基本不管及其模式
*
*
*关注参数:
* 1, _.autoPlayTimer 是setInterval原理的定时器-->播放
* 2, _.paused
* */



(function(factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports !== 'undefined') {
        module.exports = factory(require('jquery'));
    } else {
        factory(jQuery);
    }

}(function($) {
    'use strict';
    var Slick = window.Slick || {};

    /*jun*/
    var log = function(){
        if(arguments.length == 1){
            console.log("----", $.type(arguments[0]) === 'array' ? ('array.' + (arguments[0].length)) : $.type(arguments[0]), "----", arguments[0])
        }else{
            console.log( arguments[0], " = ", arguments[1] )
        }
    };
    var warn = function(){
        if(arguments.length == 1){
            console.warn("----", $.type(arguments[0]) === 'array' ? ('array.' + (arguments[0].length)) : $.type(arguments[0]), "----", arguments[0])
        }else{
            console.warn( arguments[0], " = ", arguments[1] )
        }
    };
    log('window.functioning  to protect @instanceUid');

    Slick = (function() {

        /* $(target).slick(options) */
        /* target.slick = new Slick(_[i], opt) || new Slick(target, options) || new Slick(element, settings)*/
        var instanceUid = 0;

        function Slick(element, settings) {

            var _ = this, dataSettings;

            _.defaults = {
                /*无障碍性*/accessibility: false,// 对标签添加attr属性
                /*窗口变高*/adaptiveHeight: false,// 需要特点模式
                /*按钮容器*/appendArrows: $(element),
                /*指灯容器*/appendDots: $(element),
                /*左右按钮*/arrows: true,
                /*?       */asNavFor: null,
                /*左按钮  */prevArrow: '<button type="button" data-role="none" class="slick-prev" aria-label="Previous" tabindex="0" role="button">Previous</button>',
                /*右按钮  */nextArrow: '<button type="button" data-role="none" class="slick-next" aria-label="Next" tabindex="0" role="button">Next</button>',
                /*自动播放*/autoplay: false,
                /*播放速度*/autoplaySpeed: 1000,
                /*居中模式*/centerMode: false,
                /**/centerPadding: '0px',//居中模式的情况下$list的左右padding, 所以会多显示左右一个子项
                /*切换模式*/cssEase: 'ease',
                /*指灯模板*/customPaging: function(slider, i) {return '<button type="button" data-role="none" role="button" aria-required="false" tabindex="0">' + (i + 1) + '</button>';},
                /*指灯显示*/dots: true,
                /*指灯ul类*/dotsClass: 'slick-dots',
                /*拖拉效果*/draggable: true,
                /*?       */easing: 'linear',
                /*边缘阻力*/edgeFriction: 0.35,// 系数越小, 在拖拉到边缘子项时的阻力越大
                /*切换效果*/fade: false,
                /*点击效果*/focusOnSelect: true,// 点击该子项松开后有slick-active的class
                /*循环效果*/infinite: true,
                /*起始子项*/initialSlide: 0,
                /*?*/lazyLoad: 'ondemand',
                /*手机技术*/mobileFirst: false,// Responsive settings use mobile first calculation
                /*子项悬停*/pauseOnHover: true,
                /*指灯悬停*/pauseOnDotsHover: false,
                /*响应窗口*/respondTo: 'window',
                /*响应设置*/responsive: null,
                /*排列行数*/rows: 1,
                /*方向    */rtl: false,
                /*子项标签*/slide: '',
                /*滚动行数*/slidesPerRow: 1,// 对应于rows的属性的, 以多少为一个滚动单元, 当设置rows大于1时, slidesToScroll无效, 以此属性为滚动单元.
                /*显示个数*/slidesToShow: 1,
                /*切换个数*/slidesToScroll: 1,
                /*切换速度*/speed: 500,
                /*触控功能*/swipe: true,
                /*?*/swipeToSlide: false,
                /*触控拖拉*/touchMove: true,
                /**/touchThreshold: 5,// threshold：临界值，门槛 // _.touchObject.minSwipe = _.listWidth / _.options.touchThreshold;// 临界值
                /**/useCSS: true,// Enable/Disable CSS Transitions 是否使用translate3d
                /**/useTransform: true,// 是否使用transform的CSS功能, translate 否则使用.css()方法而已
                /*可变宽度*/variableWidth: false,// Variable width slides
                /*垂直滚动*/vertical: false,
                /*垂直滑动*/verticalSwiping: false,
                /*动画排队*/waitForAnimate: true,// 使得控制在动画后执行,不会跳跃执行动画
                /*z-index */zIndex: 1000
            };

            _.initials = {
                animating: false,// 运动状态
                dragging: false,
                autoPlayTimer: null,
                currentDirection: 0,
                currentLeft: null,
                currentSlide: 0, // 默认初始化是0;
                direction: 1,
                $dots: null,
                listWidth: null,
                listHeight: null,
                loadIndex: 0,
                $nextArrow: null, // arrows为true时buildArrows赋值
                $prevArrow: null, // 同上
                slideCount: null,
                slideWidth: null,
                $slideTrack: null,
                $slides: null,
                sliding: false,
                slideOffset: 0,
                swipeLeft: null, // 拉动时的$slideTrack的目标定位
                $list: null,
                touchObject: {},
                testattr : '测试属性',
                transformsEnabled: false,// false: 使用.css()方法(降级方案)
                unslicked: false
            };

            $.extend(_, _.initials);// 赋值this

            /*后面的方法里的以options优先填充属性*/
            _.activeBreakpoint = null;
            _.animType = null;
            _.animProp = null;
            _.breakpoints = [];
            _.breakpointSettings = [];
            _.cssTransitions = false;// 
            _.hidden = 'hidden';
            _.paused = false;
            _.positionProp = null;
            _.respondTo = null;
            _.rowCount = 1;
            _.shouldClick = true;
            _.$slider = $(element);
            _.$slidesCache = null;
            _.transformType = null;
            _.transitionType = null;
            _.visibilityChange = 'visibilitychange';
            _.windowWidth = 0;
            _.windowTimer = null;

            dataSettings = $(element).data('slick') || {}; // 提供在html上修改属性并优先于js

            _.options = $.extend({}, _.defaults, dataSettings, settings);

            _.currentSlide = _.options.initialSlide;

            _.originalSettings = _.options;// 复制保存?

            if (typeof document.mozHidden !== 'undefined') {
                _.hidden = 'mozHidden';
                _.visibilityChange = 'mozvisibilitychange';
            } else if (typeof document.webkitHidden !== 'undefined') {
                _.hidden = 'webkitHidden';
                _.visibilityChange = 'webkitvisibilitychange';
            }

            /*绑定本对象与执行函数  可能这些方法提供给使用者调用! */ // _.autoPlay等等是在原型继承下来的方法
            _.autoPlay = $.proxy(_.autoPlay, _);
            _.autoPlayClear = $.proxy(_.autoPlayClear, _);
            _.changeSlide = $.proxy(_.changeSlide, _);
            _.clickHandler = $.proxy(_.clickHandler, _);
            _.selectHandler = $.proxy(_.selectHandler, _);
            _.setPosition = $.proxy(_.setPosition, _);
            _.swipeHandler = $.proxy(_.swipeHandler, _);
            _.dragHandler = $.proxy(_.dragHandler, _);
            _.keyHandler = $.proxy(_.keyHandler, _);
            _.autoPlayIterator = $.proxy(_.autoPlayIterator, _);

            _.instanceUid = instanceUid++;

            // A simple way to check for HTML strings
            // Strict HTML recognition (must start with <)
            // Extracted from jQuery v1.11 source
            _.htmlExpr = /^(?:\s*(<[\w\W]+>)[^>]*)$/;

            _.registerBreakpoints();
            _.init(true);
            _.checkResponsive(true);


        }

        return Slick;

    }());

    Slick.prototype.addSlide = Slick.prototype.slickAdd = function(markup, index, addBefore) {

        var _ = this;

        if (typeof(index) === 'boolean') {
            addBefore = index;
            index = null;
        } else if (index < 0 || (index >= _.slideCount)) {
            return false;
        }

        _.unload();

        if (typeof(index) === 'number') {
            if (index === 0 && _.$slides.length === 0) {
                $(markup).appendTo(_.$slideTrack);
            } else if (addBefore) {
                $(markup).insertBefore(_.$slides.eq(index));
            } else {
                $(markup).insertAfter(_.$slides.eq(index));
            }
        } else {
            if (addBefore === true) {
                $(markup).prependTo(_.$slideTrack);
            } else {
                $(markup).appendTo(_.$slideTrack);
            }
        }

        _.$slides = _.$slideTrack.children(this.options.slide);

        _.$slideTrack.children(this.options.slide).detach();

        _.$slideTrack.append(_.$slides);

        _.$slides.each(function(index, element) {
            $(element).attr('data-slick-index', index);
        });

        _.$slidesCache = _.$slides;

        _.reinit();

    };

    Slick.prototype.animateHeight = function() {
        // 可变高度模式的窗口高度调整
        var _ = this;
        if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false) {
            var targetHeight = _.$slides.eq(_.currentSlide).outerHeight(true);// 获取对应目标子项的包括margin的高度
            console.error('垂直移动: targetHeight', targetHeight, '目标子项', _.currentSlide);
            _.$list.animate({
                height: targetHeight// 对应调整窗口高度
            }, _.options.speed);
        }
    };

    Slick.prototype.animateSlide = function(targetLeft, callback) {
        // 纯粹的执行, 接收的参数是滑动距离, 回调函数
        console.error('执行动画方法animateSlide');
        var animProps = {},
            _ = this;

        _.animateHeight();

        if (_.options.rtl === true && _.options.vertical === false) {
            targetLeft = -targetLeft;
        }
        if (_.transformsEnabled === false) {
            // 降级方案 使用animate方案
            if (_.options.vertical === false) {
                _.$slideTrack.animate({
                    left: targetLeft
                }, _.options.speed, _.options.easing, callback);
            } else {// 垂直方向的都一样, 所以animateSlide方法只是基本的执行动画功能!
                _.$slideTrack.animate({
                    top: targetLeft
                }, _.options.speed, _.options.easing, callback);
            }

        } else {

            if (_.cssTransitions === false) {
                // 使用translate的CSS方法
                console.error(
                    '使用二级方案 测试对象：$({animStart: _.currentLeft}) ',
                    animStart,
                    $({animStart: _.currentLeft}).text()
                    )
                if (_.options.rtl === true) {
                    _.currentLeft = -(_.currentLeft);
                }
                $({animStart: _.currentLeft}) //根据当前位置获取对象？// 创造一个虚拟对象？
                // animStart应该是left的意思
                .animate({
                    animStart: targetLeft// 假设的动画目标
                }, {
                    duration: _.options.speed,
                    easing: _.options.easing,
                    step: function(now) {// 规定动画的每一步完成之后要执行的函数
                        now = Math.ceil(now);
                        // now是每步更新的修改值
                        if (_.options.vertical === false) {
                            animProps[_.animType] = 'translate(' +
                                now + 'px, 0px)';
                            _.$slideTrack.css(animProps);// 更新的数据给$slideTrack作为更新的translate的CSS操作
                        } else {
                            animProps[_.animType] = 'translate(0px,' +
                                now + 'px)';
                            _.$slideTrack.css(animProps);
                        }
                    },
                    complete: function() {
                        if (callback) {
                            callback.call();
                        }
                    }// 为何要使用模拟对象的方法？ 可能需要animate的callback函数回调
                });

            } else {
                // 使用translate3D的CSS方法
                _.applyTransition();
                targetLeft = Math.ceil(targetLeft);

                if (_.options.vertical === false) {
                    animProps[_.animType] = 'translate3d(' + targetLeft + 'px, 0px, 0px)';
                } else {
                    animProps[_.animType] = 'translate3d(0px,' + targetLeft + 'px, 0px)';
                }
                _.$slideTrack.css(animProps);

                if (callback) {
                    setTimeout(function() {

                        _.disableTransition();

                        callback.call();
                    }, _.options.speed);
                }// translate3d比较稳定？能放心的使用setTimeout来callback？ 不需animate的回调函数来callback

            }

        }

    };

    Slick.prototype.asNavFor = function(index) {
//??? 未看明白
        var _ = this,
            asNavFor = _.options.asNavFor;

        if ( asNavFor && asNavFor !== null ) {
            asNavFor = $(asNavFor).not(_.$slider);// 禁止重复的对象
        }

        if ( asNavFor !== null && typeof asNavFor === 'object' ) {
            asNavFor.each(function() {
                var target = $(this).slick('getSlick');
                if(!target.unslicked) {
                    target.slideHandler(index, true);
                }
            });
        }

    };

    Slick.prototype.applyTransition = function(slide) {

        var _ = this,
            transition = {};

        if (_.options.fade === false) {
            transition[_.transitionType] = _.transformType + ' ' + _.options.speed + 'ms ' + _.options.cssEase;
        } else {
            transition[_.transitionType] = 'opacity ' + _.options.speed + 'ms ' + _.options.cssEase;
        }

        if (_.options.fade === false) {
            _.$slideTrack.css(transition);
        } else {
            _.$slides.eq(slide).css(transition);
        }

    };

    Slick.prototype.autoPlay = function() {

        var _ = this;

        if (_.autoPlayTimer) {
            clearInterval(_.autoPlayTimer);
        }

        if (_.slideCount > _.options.slidesToShow && _.paused !== true) {
            _.autoPlayTimer = setInterval(_.autoPlayIterator,
                _.options.autoplaySpeed);
        }

    };

    Slick.prototype.autoPlayClear = function() {

        var _ = this;
        if (_.autoPlayTimer) {
            clearInterval(_.autoPlayTimer);
        }

    };

    Slick.prototype.autoPlayIterator = function() {
        // Iterator翻译:迭代器，迭代程序;
        // 处理循环模式与非循环模式的slideHandler

        var _ = this;

        if (_.options.infinite === false) {
            console.error('direction', _.direction);
            if (_.direction === 1) {

                if ((_.currentSlide + 1) === _.slideCount -
                    1) {
                    _.direction = 0;
                }
                _.slideHandler(_.currentSlide + _.options.slidesToScroll); // 累加 所以做出反向的效果

            } else {

                if ((_.currentSlide - 1 === 0)) {

                    _.direction = 1;

                }
                _.slideHandler(_.currentSlide - _.options.slidesToScroll);// 累减 所以做出反向的效果

            }

        } else {
            _.slideHandler(_.currentSlide + _.options.slidesToScroll);// _.currentSlide始终在slideCount范围内

        }

    };

    Slick.prototype.buildArrows = function() {

        var _ = this;

        if (_.options.arrows === true ) {

            _.$prevArrow = $(_.options.prevArrow).addClass('slick-arrow');
            _.$nextArrow = $(_.options.nextArrow).addClass('slick-arrow');

            if( _.slideCount > _.options.slidesToShow ) {

                _.$prevArrow.removeClass('slick-hidden').removeAttr('aria-hidden tabindex');
                _.$nextArrow.removeClass('slick-hidden').removeAttr('aria-hidden tabindex');

                if (_.htmlExpr.test(_.options.prevArrow)) {
                    _.$prevArrow.prependTo(_.options.appendArrows);
                }

                if (_.htmlExpr.test(_.options.nextArrow)) {
                    _.$nextArrow.appendTo(_.options.appendArrows);
                }

                if (_.options.infinite !== true) {
                    _.$prevArrow
                        .addClass('slick-disabled')
                        .attr('aria-disabled', 'true');
                }

            } else {

                _.$prevArrow.add( _.$nextArrow )// 学习写法

                    .addClass('slick-hidden')
                    .attr({
                        'aria-disabled': 'true',
                        'tabindex': '-1'
                    });

            }

        }

    };

    Slick.prototype.buildDots = function() {

        var _ = this,
            i, dotString;

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

            dotString = '<ul class="' + _.options.dotsClass + '">';

            for (i = 0; i <= _.getDotCount(); i += 1) {
                dotString += '<li>' + _.options.customPaging.call(this, _, i) + '</li>';
            }// 暴露模板出来, 提供修改, 值得学习

            dotString += '</ul>';

            _.$dots = $(dotString).appendTo(
                _.options.appendDots); // 保存在公共属性里

            _.$dots.find('li').first().addClass('slick-active').attr('aria-hidden', 'false');// 需处理初始化的情况

        }

    };

    Slick.prototype.buildOut = function() {

        var _ = this;

        _.$slides =
            _.$slider
                .children( _.options.slide + ':not(.slick-cloned)')// jQuery包装集的选择器方法, 第一是指定_.options.slide的标签, 第二是排除了slick-cloned的类
                .addClass('slick-slide');

        _.slideCount = _.$slides.length;

        _.$slides.each(function(index, element) {
            $(element)
                .attr('data-slick-index', index)
                .data('originalStyling', $(element).attr('style') || '');// 每个切换单元的保存属性
        });

        _.$slider.addClass('slick-slider');

        _.$slideTrack = (_.slideCount === 0) ?
            $('<div class="slick-track"/>').appendTo(_.$slider) :
            _.$slides.wrapAll('<div class="slick-track"/>').parent();// 给与一个滑动层, 学习的写法: 添加一个外层并获取外层的jQuery包装集

        _.$list = _.$slideTrack.wrap(
            '<div aria-live="polite" class="slick-list"/>').parent();
        _.$slideTrack.css('opacity', 1);// 隐藏? //修改了0->1

        if (_.options.centerMode === true || _.options.swipeToSlide === true) {
            _.options.slidesToScroll = 1;// 居中模式调整滚动切换的单元
            log('居中模式调整滚动切换的单元')
        }

        $('img[data-lazy]', _.$slider).not('[src]').addClass('slick-loading');// ?标记为何?

        _.setupInfinite();

        _.buildArrows();

        _.buildDots();

        _.updateDots();

        _.setSlideClasses(typeof _.currentSlide === 'number' ? _.currentSlide : 0);

        if (_.options.draggable === true) {
            _.$list.addClass('draggable');
        }

    };

    Slick.prototype.buildRows = function() {
        // 建立分行
        var _ = this, a, b, c, newSlides, numOfSlides, originalSlides,slidesPerSection;

        newSlides = document.createDocumentFragment();
        originalSlides = _.$slider.children();

        if(_.options.rows > 1) {
            //
            slidesPerSection = _.options.slidesPerRow * _.options.rows;// 切换的个数 , 一个滚动单元
            numOfSlides = Math.ceil(
                originalSlides.length / slidesPerSection
            );// 切换单元的总数

            for(a = 0; a < numOfSlides; a++){ //切换单元
                var slide = document.createElement('div');
                for(b = 0; b < _.options.rows; b++) { // 切换单元中的每一行
                    var row = document.createElement('div');
                    for(c = 0; c < _.options.slidesPerRow; c++) {// 切换单元中的每一行的子项
                        var target = (a * slidesPerSection + ((b * _.options.slidesPerRow) + c)); // 算法
                        if (originalSlides.get(target)) {
                            row.appendChild(originalSlides.get(target));// 核心使用jQuery包装集的.get()方法获取dom元素
                        }
                    }
                    slide.appendChild(row);
                }
                newSlides.appendChild(slide);
            }

            _.$slider.html(newSlides);// 一次性替换!
            _.$slider.children().children().children()
                .css({
                    'width':(100 / _.options.slidesPerRow) + '%',
                    'display': 'inline-block'
                });// ? CSS在这里写?

        }

    };

    Slick.prototype.checkResponsive = function(initial, forceUpdate) {

        var _ = this,
            breakpoint, targetBreakpoint, respondToWidth, triggerBreakpoint = false;
        var sliderWidth = _.$slider.width();
        var windowWidth = window.innerWidth || $(window).width();

        if (_.respondTo === 'window') {
            respondToWidth = windowWidth;
        } else if (_.respondTo === 'slider') {
            respondToWidth = sliderWidth;
        } else if (_.respondTo === 'min') {
            respondToWidth = Math.min(windowWidth, sliderWidth);
        }

        if ( _.options.responsive &&
            _.options.responsive.length &&
            _.options.responsive !== null) {

            targetBreakpoint = null;

            for (breakpoint in _.breakpoints) {
                if (_.breakpoints.hasOwnProperty(breakpoint)) {
                    if (_.originalSettings.mobileFirst === false) {
                        if (respondToWidth < _.breakpoints[breakpoint]) {
                            targetBreakpoint = _.breakpoints[breakpoint];
                        }
                    } else {
                        if (respondToWidth > _.breakpoints[breakpoint]) {
                            targetBreakpoint = _.breakpoints[breakpoint];
                        }
                    }
                }
            }

            if (targetBreakpoint !== null) {
                if (_.activeBreakpoint !== null) {
                    if (targetBreakpoint !== _.activeBreakpoint || forceUpdate) {
                        _.activeBreakpoint =
                            targetBreakpoint;
                        if (_.breakpointSettings[targetBreakpoint] === 'unslick') {
                            _.unslick(targetBreakpoint);
                        } else {
                            _.options = $.extend({}, _.originalSettings,
                                _.breakpointSettings[
                                    targetBreakpoint]);
                            if (initial === true) {
                                _.currentSlide = _.options.initialSlide;
                            }
                            _.refresh(initial);
                        }
                        triggerBreakpoint = targetBreakpoint;
                    }
                } else {
                    _.activeBreakpoint = targetBreakpoint;
                    if (_.breakpointSettings[targetBreakpoint] === 'unslick') {
                        _.unslick(targetBreakpoint);
                    } else {
                        _.options = $.extend({}, _.originalSettings,
                            _.breakpointSettings[
                                targetBreakpoint]);
                        if (initial === true) {
                            _.currentSlide = _.options.initialSlide;
                        }
                        _.refresh(initial);
                    }
                    triggerBreakpoint = targetBreakpoint;
                }
            } else {
                if (_.activeBreakpoint !== null) {
                    _.activeBreakpoint = null;
                    _.options = _.originalSettings;
                    if (initial === true) {
                        _.currentSlide = _.options.initialSlide;
                    }
                    _.refresh(initial);
                    triggerBreakpoint = targetBreakpoint;
                }
            }

            // only trigger breakpoints during an actual break. not on initialize.
            if( !initial && triggerBreakpoint !== false ) {
                _.$slider.trigger('breakpoint', [_, triggerBreakpoint]);
            }
        }

    };

    Slick.prototype.changeSlide = function(event, dontAnimate) {
        // 触发事件
        // 按钮切换事件：切换一般按slideToScroll来累加， 但遇到最后一轮的话需要方法调整定位子项。
        // 功能是计算目标子项， 核心使用slideHandler来执行

        var _ = this,
            $target = $(event.target),// 获取目标对象
            indexOffset, slideOffset, unevenOffset;

        // If target is a link, prevent default action.
        if($target.is('a')) {
            event.preventDefault();// 取消a标签的默认操作事件：跳转
        }

        // If target is not the <li> element (ie: a child), find the <li>.
        if(!$target.is('li')) {
            $target = $target.closest('li');
        }

        unevenOffset = (_.slideCount % _.options.slidesToScroll !== 0);// 非整除
        indexOffset = unevenOffset ? 0 : (_.slideCount - _.currentSlide) % _.options.slidesToScroll;
        // indexOffset逻辑不明白？
        console.error('绑定事件传递的参数： event.data.message ', event.data.message);
        switch (event.data.message) {
            //重点学习，绑定事件的多元处理， 通过传递event.data的信息来分类处理

            case 'previous':
                slideOffset = indexOffset === 0 ? _.options.slidesToScroll : _.options.slidesToShow - indexOffset;
                if (_.slideCount > _.options.slidesToShow) {
                    _.slideHandler(_.currentSlide - slideOffset, false, dontAnimate);
                }
                break;

            case 'next':
                slideOffset = indexOffset === 0 ? _.options.slidesToScroll : indexOffset;
                if (_.slideCount > _.options.slidesToShow) {
                    _.slideHandler(_.currentSlide + slideOffset, false, dontAnimate);
                }
                break;

            case 'index':
                var index = event.data.index === 0 ? 0 :
                    event.data.index || $target.index() * _.options.slidesToScroll;

                _.slideHandler(_.checkNavigable(index), false, dontAnimate);
                $target.children().trigger('focus');
                break;

            default:
                return;
        }

    };

    Slick.prototype.checkNavigable = function(index) {

        var _ = this,
            navigables, prevNavigable;

        navigables = _.getNavigableIndexes();
        prevNavigable = 0;
        if (index > navigables[navigables.length - 1]) {
            index = navigables[navigables.length - 1];
        } else {
            for (var n in navigables) {
                if (index < navigables[n]) {
                    index = prevNavigable;
                    break;
                }
                prevNavigable = navigables[n];
            }
        }

        return index;
    };

    Slick.prototype.cleanUpEvents = function() {

        var _ = this;

        if (_.options.dots && _.$dots !== null) {

            $('li', _.$dots).off('click.slick', _.changeSlide);

            if (_.options.pauseOnDotsHover === true && _.options.autoplay === true) {

                $('li', _.$dots)
                    .off('mouseenter.slick', $.proxy(_.setPaused, _, true))
                    .off('mouseleave.slick', $.proxy(_.setPaused, _, false));

            }

        }

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
            _.$prevArrow && _.$prevArrow.off('click.slick', _.changeSlide);
            _.$nextArrow && _.$nextArrow.off('click.slick', _.changeSlide);
        }

        _.$list.off('touchstart.slick mousedown.slick', _.swipeHandler);
        _.$list.off('touchmove.slick mousemove.slick', _.swipeHandler);
        _.$list.off('touchend.slick mouseup.slick', _.swipeHandler);
        _.$list.off('touchcancel.slick mouseleave.slick', _.swipeHandler);

        _.$list.off('click.slick', _.clickHandler);

        $(document).off(_.visibilityChange, _.visibility);

        _.$list.off('mouseenter.slick', $.proxy(_.setPaused, _, true));
        _.$list.off('mouseleave.slick', $.proxy(_.setPaused, _, false));

        if (_.options.accessibility === true) {
            _.$list.off('keydown.slick', _.keyHandler);
        }

        if (_.options.focusOnSelect === true) {
            $(_.$slideTrack).children().off('click.slick', _.selectHandler);
        }

        $(window).off('orientationchange.slick.slick-' + _.instanceUid, _.orientationChange);

        $(window).off('resize.slick.slick-' + _.instanceUid, _.resize);

        $('[draggable!=true]', _.$slideTrack).off('dragstart', _.preventDefault);

        $(window).off('load.slick.slick-' + _.instanceUid, _.setPosition);
        $(document).off('ready.slick.slick-' + _.instanceUid, _.setPosition);
    };

    Slick.prototype.cleanUpRows = function() {

        var _ = this, originalSlides;

        if(_.options.rows > 1) {
            originalSlides = _.$slides.children().children();
            originalSlides.removeAttr('style');
            _.$slider.html(originalSlides);
        }

    };

    Slick.prototype.clickHandler = function(event) {

        var _ = this;

        if (_.shouldClick === false) {
            event.stopImmediatePropagation();
            event.stopPropagation();
            event.preventDefault();
        }

    };

    Slick.prototype.destroy = function(refresh) {

        var _ = this;

        _.autoPlayClear();

        _.touchObject = {};

        _.cleanUpEvents();

        $('.slick-cloned', _.$slider).detach();

        if (_.$dots) {
            _.$dots.remove();
        }


        if ( _.$prevArrow && _.$prevArrow.length ) {

            _.$prevArrow
                .removeClass('slick-disabled slick-arrow slick-hidden')
                .removeAttr('aria-hidden aria-disabled tabindex')
                .css("display","");

            if ( _.htmlExpr.test( _.options.prevArrow )) {
                _.$prevArrow.remove();
            }
        }

        if ( _.$nextArrow && _.$nextArrow.length ) {

            _.$nextArrow
                .removeClass('slick-disabled slick-arrow slick-hidden')
                .removeAttr('aria-hidden aria-disabled tabindex')
                .css("display","");

            if ( _.htmlExpr.test( _.options.nextArrow )) {
                _.$nextArrow.remove();
            }

        }


        if (_.$slides) {

            _.$slides
                .removeClass('slick-slide slick-active slick-center slick-visible slick-current')
                .removeAttr('aria-hidden')
                .removeAttr('data-slick-index')
                .each(function(){
                    $(this).attr('style', $(this).data('originalStyling'));
                });

            _.$slideTrack.children(this.options.slide).detach();

            _.$slideTrack.detach();

            _.$list.detach();

            _.$slider.append(_.$slides);
        }

        _.cleanUpRows();

        _.$slider.removeClass('slick-slider');
        _.$slider.removeClass('slick-initialized');

        _.unslicked = true;

        if(!refresh) {
            _.$slider.trigger('destroy', [_]);
        }

    };

    Slick.prototype.disableTransition = function(slide) {

        var _ = this,
            transition = {};

        transition[_.transitionType] = '';

        if (_.options.fade === false) {
            _.$slideTrack.css(transition);
        } else {
            _.$slides.eq(slide).css(transition);
        }

    };

    Slick.prototype.fadeSlide = function(slideIndex, callback) {

        var _ = this;

        if (_.cssTransitions === false) {

            _.$slides.eq(slideIndex).css({
                zIndex: _.options.zIndex
            });

            _.$slides.eq(slideIndex).animate({
                opacity: 1
            }, _.options.speed, _.options.easing, callback);

        } else {

            _.applyTransition(slideIndex);

            _.$slides.eq(slideIndex).css({
                opacity: 1,
                zIndex: _.options.zIndex
            });

            if (callback) {
                setTimeout(function() {

                    _.disableTransition(slideIndex);

                    callback.call();
                }, _.options.speed);
            }

        }

    };

    Slick.prototype.fadeSlideOut = function(slideIndex) {

        var _ = this;

        if (_.cssTransitions === false) {

            _.$slides.eq(slideIndex).animate({
                opacity: 0,
                zIndex: _.options.zIndex - 2
            }, _.options.speed, _.options.easing);

        } else {

            _.applyTransition(slideIndex);

            _.$slides.eq(slideIndex).css({
                opacity: 0,
                zIndex: _.options.zIndex - 2
            });

        }

    };

    Slick.prototype.filterSlides = Slick.prototype.slickFilter = function(filter) {

        var _ = this;

        if (filter !== null) {

            _.$slidesCache = _.$slides;

            _.unload();

            _.$slideTrack.children(this.options.slide).detach();

            _.$slidesCache.filter(filter).appendTo(_.$slideTrack);

            _.reinit();

        }

    };

    Slick.prototype.getCurrent = Slick.prototype.slickCurrentSlide = function() {

        var _ = this;
        return _.currentSlide;

    };

    Slick.prototype.getDotCount = function() {

        var _ = this;

        var breakPoint = 0;
        var counter = 0;
        var pagerQty = 0;

        if (_.options.infinite === true) {
            while (breakPoint < _.slideCount) {
                ++pagerQty;
                breakPoint = counter + _.options.slidesToShow;
                counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
            }
        } else if (_.options.centerMode === true) {
            pagerQty = _.slideCount;
        } else {
            while (breakPoint < _.slideCount) { // 累计方法
                ++pagerQty;
                breakPoint = counter + _.options.slidesToShow;
                counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
                // 跳跃应该等于slidesToScroll但slidesToScroll大于slidesToShow的话取值于slidesToShow
                // += Math.min(_.options.slidesToScroll,  _.options.slidesToShow);
            }
        }

        return pagerQty - 1;

    };

    Slick.prototype.getLeft = function(slideIndex) {
        // 定位, 频繁调用的方法
        // 算出_.slideOffset , return:targetLeft
        var _ = this,
            targetLeft,
            verticalHeight,
            verticalOffset = 0,
            targetSlide;

        _.slideOffset = 0;
        verticalHeight = _.$slides.first().outerHeight(true);

        /* 循环模式正否 */
        // 在循环模式非最后一轮
        // 在循环模式的最后一轮: 非倍数情况
        // 非循环模式的最后一轮
        // 居中循环模式 +=
        // 居中不循环模式 +=
        // 循环不居中模式 nonehandle
        //      在以上基础:
        //      可变宽度模式 :
        //

        if (_.options.infinite === true) {
            // 在循环模式非最后一轮
            if (_.slideCount > _.options.slidesToShow) {
                _.slideOffset = (_.slideWidth * _.options.slidesToShow) * -1;// 为何不直接用$.listWidth, 因为slideWidth是取整
                //log(' _.slideOffset', _.slideOffset);
                verticalOffset = (verticalHeight * _.options.slidesToShow) * -1;// ?
            }
            // 在循环模式的最后一轮
            if (_.slideCount % _.options.slidesToScroll !== 0) {
                // 非倍数情况, 居中模式是倍数
                if (slideIndex + _.options.slidesToScroll > _.slideCount && _.slideCount > _.options.slidesToShow) {
                    // slideIndex > _.slideCount -  _.options.slidesToScroll 最后一轮
                    if (slideIndex > _.slideCount) { // ? 未知
                        console.error('最后一轮, slideIndex > _.slideCount');
                        _.slideOffset = ((_.options.slidesToShow - (slideIndex - _.slideCount)) * _.slideWidth) * -1;
                        verticalOffset = ((_.options.slidesToShow - (slideIndex - _.slideCount)) * verticalHeight) * -1;
                    } else {
                        // 最后一轮: 取余数remainder * 子项宽度作为slideoffset
                        _.slideOffset = ((_.slideCount % _.options.slidesToScroll) * _.slideWidth) * -1;
                        verticalOffset = ((_.slideCount % _.options.slidesToScroll) * verticalHeight) * -1;
                    }
                }
            }
            //warn('循环模式: 计算出的_.slideOffset', _.slideOffset);
        } else {// 非循环模式
            if (slideIndex + _.options.slidesToShow > _.slideCount) {
                // slideIndex > _.slideCount - _.options.slidesToShow
                // 首先明确是在最后一个指示灯acitve情况, 由于不是>=, 所以当slideIndex = _.slideCount - _.options.slidesToShow不会出现
                // 当(slidecount - slidesToShow) % slideToScroll == 0时不执行下列代码
                // 本条件满足时, currentslide不靠左, 所以
                _.slideOffset = ((slideIndex + _.options.slidesToShow) - _.slideCount) * _.slideWidth;
                verticalOffset = ((slideIndex + _.options.slidesToShow) - _.slideCount) * verticalHeight;
            }
            log('非循环模式: 计算出的_.slideOffset', _.slideOffset);
        }

        if (_.slideCount <= _.options.slidesToShow) {
            _.slideOffset = 0;
            verticalOffset = 0;
        }


        /*居中模式*/
        if (_.options.centerMode === true && _.options.infinite === true) {
            _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2) - _.slideWidth;
            log('居中循环模式更新_.slideOffset', _.slideOffset)
        } else if (_.options.centerMode === true) {
            _.slideOffset = 0;
            _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2);
            log('居中不循环模式更新_.slideOffset', _.slideOffset)
        } else {
            if(_.options.infinite === true){
                log('循环不居中模式更新_.slideOffset', _.slideOffset)
            }
        }

        if (_.options.vertical === false) {
            targetLeft = ((slideIndex * _.slideWidth) * -1) + _.slideOffset;
            console.log(
                '目标偏离 targetLeft = ',
                targetLeft,
                ' = slideIndex',
                slideIndex,
                ' * slideWidth',
                -_.slideWidth,
                ' + slideOffset',
                _.slideOffset
            );
        } else {
            targetLeft = ((slideIndex * verticalHeight) * -1) + verticalOffset;
            warn('垂直targetLeft', targetLeft);
        }

        if (_.options.variableWidth === true) {
            // ???? 未看
            if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
                targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex);
            } else {
                targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex + _.options.slidesToShow);
            }

            targetLeft = targetSlide[0] ? targetSlide[0].offsetLeft * -1 : 0;// 直接获取当前子项的相对文档的左偏离

            if (_.options.centerMode === true) {
                if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
                    targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex);
                } else {
                    targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex + _.options.slidesToShow + 1);
                }
                targetLeft = targetSlide[0] ? targetSlide[0].offsetLeft * -1 : 0;
                targetLeft += (_.$list.width() - targetSlide.outerWidth()) / 2;
            }
        }
        //console.error('targetLeft', targetLeft);
        return targetLeft;

    };

    Slick.prototype.getOption = Slick.prototype.slickGetOption = function(option) {

        var _ = this;

        return _.options[option];

    };

    Slick.prototype.getNavigableIndexes = function() {

        var _ = this,
            breakPoint = 0,
            counter = 0,
            indexes = [],
            max;

        if (_.options.infinite === false) {
            max = _.slideCount;
        } else {
            breakPoint = _.options.slidesToScroll * -1;
            counter = _.options.slidesToScroll * -1;
            max = _.slideCount * 2;
        }

        while (breakPoint < max) {
            indexes.push(breakPoint);
            breakPoint = counter + _.options.slidesToScroll;
            counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
        }

        return indexes;

    };

    Slick.prototype.getSlick = function() {

        return this;

    };

    Slick.prototype.getSlideCount = function() {

        var _ = this,
            slidesTraversed, swipedSlide, centerOffset;

        centerOffset = _.options.centerMode === true ? _.slideWidth * Math.floor(_.options.slidesToShow / 2) : 0;

        if (_.options.swipeToSlide === true) {
            _.$slideTrack.find('.slick-slide').each(function(index, slide) {
                if (slide.offsetLeft - centerOffset + ($(slide).outerWidth() / 2) > (_.swipeLeft * -1)) {
                    swipedSlide = slide;
                    return false;
                }
            });

            slidesTraversed = Math.abs($(swipedSlide).attr('data-slick-index') - _.currentSlide) || 1;

            return slidesTraversed;

        } else {
            return _.options.slidesToScroll;
        }

    };

    Slick.prototype.goTo = Slick.prototype.slickGoTo = function(slide, dontAnimate) {

        var _ = this;

        _.changeSlide({
            data: {
                message: 'index',
                index: parseInt(slide)
            }
        }, dontAnimate);

    };

    Slick.prototype.init = function(creation) {

        var _ = this;

        if (!$(_.$slider).hasClass('slick-initialized')) {

            $(_.$slider).addClass('slick-initialized');// 避免重复初始化! 重复slick的无效!

            _.buildRows();
            _.buildOut();// 循环模式cloned, 箭头按钮, 标签的逻辑class
            _.setProps();// 设置_.positionProp,  _.cssTransitions,  _.animType,  _.transformsEnabled,  _.transformType,  _.transitionType, _.options.zIndex
            _.startLoad();
            _.loadSlider();
            _.initializeEvents();
            _.updateArrows();
            _.updateDots();

        }

        if (creation) {
            _.$slider.trigger('init', [_]);
        }

        if (_.options.accessibility === true) {
            _.initADA();
        }

    };

    Slick.prototype.initArrowEvents = function() {

        var _ = this;

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
            _.$prevArrow.on('click.slick', {
                message: 'previous'
            }, _.changeSlide);
            _.$nextArrow.on('click.slick', {
                message: 'next'
            }, _.changeSlide);
        }

    };

    Slick.prototype.initDotEvents = function() {

        var _ = this;

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {
            $('li', _.$dots).on('click.slick', {
                message: 'index'
            }, _.changeSlide);
        }

        if (_.options.dots === true && _.options.pauseOnDotsHover === true && _.options.autoplay === true) {
            $('li', _.$dots)
                .on('mouseenter.slick', $.proxy(_.setPaused, _, true))
                .on('mouseleave.slick', $.proxy(_.setPaused, _, false));
                // 重大问题： 什么情况需要绑定函数与上下文！
                // 是不是这些绑定事件是用户交互事件触发， 所以方法在window或其它上下文执行， 所以需要绑定上下文与该执行方法
        }

    };

    Slick.prototype.initializeEvents = function() {

        var _ = this;

        _.initArrowEvents();

        _.initDotEvents();

        _.$list.on('touchstart.slick mousedown.slick', {
            action: 'start'
        }, _.swipeHandler);
        _.$list.on('touchmove.slick mousemove.slick', {
            action: 'move'
        }, _.swipeHandler);
        _.$list.on('touchend.slick mouseup.slick', {
            action: 'end'
        }, _.swipeHandler);
        _.$list.on('touchcancel.slick mouseleave.slick', {
            action: 'end'
        }, _.swipeHandler);

        _.$list.on('click.slick', _.clickHandler);

        $(document).on(_.visibilityChange, $.proxy(_.visibility, _));

        _.$list.on('mouseenter.slick', $.proxy(_.setPaused, _, true));
        _.$list.on('mouseleave.slick', $.proxy(_.setPaused, _, false));

        if (_.options.accessibility === true) {
            _.$list.on('keydown.slick', _.keyHandler);
        }

        if (_.options.focusOnSelect === true) {
            $(_.$slideTrack).children().on('click.slick', _.selectHandler);
        }

        $(window).on('orientationchange.slick.slick-' + _.instanceUid, $.proxy(_.orientationChange, _));

        $(window).on('resize.slick.slick-' + _.instanceUid, $.proxy(_.resize, _));

        $('[draggable!=true]', _.$slideTrack).on('dragstart', _.preventDefault);

        $(window).on('load.slick.slick-' + _.instanceUid, _.setPosition);
        $(document).on('ready.slick.slick-' + _.instanceUid, _.setPosition);

    };

    Slick.prototype.initUI = function() {

        var _ = this;

        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {

            _.$prevArrow.show();
            _.$nextArrow.show();

        }

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

            _.$dots.show();

        }

        if (_.options.autoplay === true) {

            _.autoPlay();

        }

    };

    Slick.prototype.keyHandler = function(event) {

        var _ = this;
         //Dont slide if the cursor is inside the form fields and arrow keys are pressed
        if(!event.target.tagName.match('TEXTAREA|INPUT|SELECT')) {
            if (event.keyCode === 37 && _.options.accessibility === true) {
                _.changeSlide({
                    data: {
                        message: 'previous'
                    }
                });
            } else if (event.keyCode === 39 && _.options.accessibility === true) {
                _.changeSlide({
                    data: {
                        message: 'next'
                    }
                });
            }
        }

    };

    Slick.prototype.lazyLoad = function() {
        var _ = this,
            loadRange, cloneRange, rangeStart, rangeEnd;

        function loadImages(imagesScope) {
            $('img[data-lazy]', imagesScope).each(function() {

                var image = $(this),
                    imageSource = $(this).attr('data-lazy'),
                    imageToLoad = document.createElement('img');

                imageToLoad.onload = function() {// 获取图片后以渐现的形式加载到目标中
                    image
                        .animate({ opacity: 0 }, 100, function() {// 0.1秒变为透明(不改变布局)后callback
                            image
                                .attr('src', imageSource)// 更新图片
                                .animate({ opacity: 1 }, 200, function() {// 0.2秒呈现callback去除延迟加载属性
                                    image
                                        .removeAttr('data-lazy')
                                        .removeClass('slick-loading');
                                });
                        });
                };

                imageToLoad.src = imageSource;// 设定src即触发load事件

            });
        }

        if (_.options.centerMode === true) {
            if (_.options.infinite === true) {
                // 居中+循环模式是特别的: 除了要显示的slidesToShow个,还要显示左右侧1个,所以要加载显示slidesToShow+2个
                rangeStart = _.currentSlide + (_.options.slidesToShow / 2 + 1);
                rangeEnd = rangeStart + _.options.slidesToShow + 2;
            } else {
                rangeStart = Math.max(0, _.currentSlide - (_.options.slidesToShow / 2 + 1));
                rangeEnd = 2 + (_.options.slidesToShow / 2 + 1) + _.currentSlide;
            }
        } else {
            rangeStart = _.options.infinite ? _.options.slidesToShow + _.currentSlide : _.currentSlide;
            rangeEnd = rangeStart + _.options.slidesToShow;
            if (_.options.fade === true) {
                if (rangeStart > 0) rangeStart--;
                if (rangeEnd <= _.slideCount) rangeEnd++;
            }
        }
        //console.warn('lazyload 范围:', rangeStart, rangeEnd);

        loadRange = _.$slider.find('.slick-slide').slice(rangeStart, rangeEnd);

        log('lazyload加载的子项', loadRange.text());
        loadImages(loadRange);

        /*已经加载了图片, 可以复制到队列里相同的子项  但不明白居中模式时候的问题?*/
        if (_.slideCount <= _.options.slidesToShow) {
            cloneRange = _.$slider.find('.slick-slide');
            loadImages(cloneRange);
        } else // 以下这些情况应该是针对初始化的时候 , initialSlide不一定是0的情况
        if (_.currentSlide >= _.slideCount - _.options.slidesToShow) { // 后尾显示clone
            cloneRange = _.$slider.find('.slick-cloned').slice(0, _.options.slidesToShow);
            loadImages(cloneRange);
            //log('cloned集合:',_.$slider.find('.slick-cloned').text());
            //log('复制',cloneRange.text())
        } else if (_.currentSlide === 0) { // 开头0时
            cloneRange = _.$slider.find('.slick-cloned').slice(_.options.slidesToShow * -1);
            loadImages(cloneRange);
            //log('cloned集合:',_.$slider.find('.slick-cloned').text());
            //log('复制',cloneRange.text());
        }

    };

    Slick.prototype.loadSlider = function() {

        var _ = this;

        _.setPosition();

        _.$slideTrack.css({
            opacity: 1
        });

        _.$slider.removeClass('slick-loading');

        _.initUI();

        if (_.options.lazyLoad === 'progressive') {
            _.progressiveLazyLoad();
        }

    };

    Slick.prototype.next = Slick.prototype.slickNext = function() {

        var _ = this;

        _.changeSlide({
            data: {
                message: 'next'
            }
        });

    };

    Slick.prototype.orientationChange = function() {

        var _ = this;

        _.checkResponsive();
        _.setPosition();

    };

    Slick.prototype.pause = Slick.prototype.slickPause = function() {

        var _ = this;

        _.autoPlayClear();
        _.paused = true;

    };

    Slick.prototype.play = Slick.prototype.slickPlay = function() {

        var _ = this;

        _.paused = false;
        _.autoPlay();

    };

    Slick.prototype.postSlide = function(index) {
        console.log('postSlide');
        // 方法postSlide的意义在于(核心仅setPosition可以)
        // 1, 添加触发事件
        // 2,
        // 3,
        var _ = this;

        _.$slider.trigger('afterChange', [_, index]);

        _.animating = false;

        _.setPosition();

        _.swipeLeft = null;// 清空触控数据?

        if (_.options.autoplay === true && _.paused === false) {
            _.autoPlay();// 继续
        }
        if (_.options.accessibility === true) {
            _.initADA();
        }

    };

    Slick.prototype.prev = Slick.prototype.slickPrev = function() {

        var _ = this;

        _.changeSlide({
            data: {
                message: 'previous'
            }
        });

    };

    Slick.prototype.preventDefault = function(event) {
        event.preventDefault();
    };

    Slick.prototype.progressiveLazyLoad = function() {

        var _ = this,
            imgCount, targetImage;

        imgCount = $('img[data-lazy]', _.$slider).length;

        if (imgCount > 0) {
            targetImage = $('img[data-lazy]', _.$slider).first();
            targetImage.attr('src', null);
            targetImage.attr('src', targetImage.attr('data-lazy')).removeClass('slick-loading').load(function() {
                    targetImage.removeAttr('data-lazy');
                    _.progressiveLazyLoad();

                    if (_.options.adaptiveHeight === true) {
                        _.setPosition();
                    }
                })
                .error(function() {
                    targetImage.removeAttr('data-lazy');
                    _.progressiveLazyLoad();
                });
        }

    };

    Slick.prototype.refresh = function( initializing ) {

        var _ = this, currentSlide, firstVisible;

        firstVisible = _.slideCount - _.options.slidesToShow;

        // check that the new breakpoint can actually accept the
        // "current slide" as the current slide, otherwise we need
        // to set it to the closest possible value.
        if ( !_.options.infinite ) {
            if ( _.slideCount <= _.options.slidesToShow ) {
                _.currentSlide = 0;
            } else if ( _.currentSlide > firstVisible ) {
                _.currentSlide = firstVisible;
            }
        }

         currentSlide = _.currentSlide;

        _.destroy(true);

        $.extend(_, _.initials, { currentSlide: currentSlide });

        _.init();

        if( !initializing ) {

            _.changeSlide({
                data: {
                    message: 'index',
                    index: currentSlide
                }
            }, false);

        }

    };

    Slick.prototype.registerBreakpoints = function() {
        var _ = this, breakpoint, currentBreakpoint, l,
            responsiveSettings = _.options.responsive || null;

        if ( $.type(responsiveSettings) === "array" && responsiveSettings.length ) {

            _.respondTo = _.options.respondTo || 'window';

            for ( breakpoint in responsiveSettings ) {

                l = _.breakpoints.length-1;

                currentBreakpoint = responsiveSettings[breakpoint].breakpoint;

                if (responsiveSettings.hasOwnProperty(breakpoint)) {
                    // loop through the breakpoints and cut out any existing
                    // ones with the same breakpoint number, we don't want dupes.
                    while( l >= 0 ) { // 对比上一个,重复的就删除
                        if( _.breakpoints[l] && _.breakpoints[l] === currentBreakpoint ) {
                            _.breakpoints.splice(l,1);
                        }
                        l--;
                    }

                    _.breakpoints.push(currentBreakpoint);
                    _.breakpointSettings[currentBreakpoint] = responsiveSettings[breakpoint].settings;

                }

            }
            // 整理响应式信息保存到变量
            log('_.breakpointSettings', _.breakpointSettings);
            log('_.breakpoints', _.breakpoints);

            _.breakpoints.sort(function(a, b) { // 重新排序
                return ( _.options.mobileFirst ) ? a-b : b-a;
            });

        }

    };

    Slick.prototype.reinit = function() {

        var _ = this;

        _.$slides =
            _.$slideTrack
                .children(_.options.slide)
                .addClass('slick-slide');

        _.slideCount = _.$slides.length;

        if (_.currentSlide >= _.slideCount && _.currentSlide !== 0) {
            _.currentSlide = _.currentSlide - _.options.slidesToScroll;
        }

        if (_.slideCount <= _.options.slidesToShow) {
            _.currentSlide = 0;
        }

        _.registerBreakpoints();

        _.setProps();
        _.setupInfinite();
        _.buildArrows();
        _.updateArrows();
        _.initArrowEvents();
        _.buildDots();
        _.updateDots();
        _.initDotEvents();

        _.checkResponsive(false, true);

        if (_.options.focusOnSelect === true) {
            $(_.$slideTrack).children().on('click.slick', _.selectHandler);
        }

        _.setSlideClasses(0);

        _.setPosition();

        _.$slider.trigger('reInit', [_]);

        if (_.options.autoplay === true) {
            _.focusHandler();
        }

    };

    Slick.prototype.resize = function() {

        var _ = this;

        if ($(window).width() !== _.windowWidth) {
            clearTimeout(_.windowDelay);
            _.windowDelay = window.setTimeout(function() {
                _.windowWidth = $(window).width();
                _.checkResponsive();
                if( !_.unslicked ) { _.setPosition(); }
            }, 50);
        }
    };

    Slick.prototype.removeSlide = Slick.prototype.slickRemove = function(index, removeBefore, removeAll) {

        var _ = this;

        if (typeof(index) === 'boolean') {
            removeBefore = index;
            index = removeBefore === true ? 0 : _.slideCount - 1;
        } else {
            index = removeBefore === true ? --index : index;
        }

        if (_.slideCount < 1 || index < 0 || index > _.slideCount - 1) {
            return false;
        }

        _.unload();

        if (removeAll === true) {
            _.$slideTrack.children().remove();
        } else {
            _.$slideTrack.children(this.options.slide).eq(index).remove();
        }

        _.$slides = _.$slideTrack.children(this.options.slide);

        _.$slideTrack.children(this.options.slide).detach();

        _.$slideTrack.append(_.$slides);

        _.$slidesCache = _.$slides;

        _.reinit();

    };

    Slick.prototype.setCSS = function(position) {
        // 核心功能, 设当前子项的css对齐.
        var _ = this,
            positionProps = {},
            x, y;

        if (_.options.rtl === true) {
            position = -position;
        }
        x = _.positionProp == 'left' ? Math.ceil(position) + 'px' : '0px';
        y = _.positionProp == 'top' ? Math.ceil(position) + 'px' : '0px';

        positionProps[_.positionProp] = position;

        if (_.transformsEnabled === false) {
            _.$slideTrack.css(positionProps);
        } else {
            positionProps = {};
            if (_.cssTransitions === false) {
                positionProps[_.animType] = 'translate(' + x + ', ' + y + ')';
                _.$slideTrack.css(positionProps);
            } else {
                positionProps[_.animType] = 'translate3d(' + x + ', ' + y + ', 0px)';
                _.$slideTrack.css(positionProps);
            }
        }
        log('当前css位置', positionProps);
    };

    Slick.prototype.setDimensions = function() {
        // dimensions翻译: 规模; 方面; 面积; 特点
        // 调整子项宽度, 窗口尺寸, $slideTrack的宽度
        var _ = this;

        if (_.options.vertical === false) {
            if (_.options.centerMode === true) {
                //warn('居中模式的扩展$list--padding');
                _.$list.css({
                    padding: ('10px ' + _.options.centerPadding)
                });
            }
        } else {
            // 垂直方向撑开$list的高度可视slideToShow

            _.$list.height(_.$slides.first().outerHeight(true) * _.options.slidesToShow);
            console.log('_.$slides.first().outerHeight(true) = ', _.$slides.first().outerHeight(true), ' *3 = _.$list.height = ', _.$list.height());
            if (_.options.centerMode === true) {
                _.$list.css({
                    padding: (_.options.centerPadding + ' 0px')
                });
            }
        }
        // 记录窗口尺寸
        _.listWidth = _.$list.width();
        _.listHeight = _.$list.height();
        console.log('窗口尺寸 _.listWidth',_.listWidth, '_.listHeight',_.listHeight);

        if (_.options.vertical === false && _.options.variableWidth === false) {
            // 计算出显示的子项宽度 = 窗口 / 子项数 --> 取整数
            _.slideWidth = Math.ceil(_.listWidth / _.options.slidesToShow);
            // 计算出$slideTrack的总宽度 --> 取整数
            _.$slideTrack.width(Math.ceil((_.slideWidth * _.$slideTrack.children('.slick-slide').length)));

        } else if (_.options.variableWidth === true) {
            _.$slideTrack.width(5000 * _.slideCount);
        } else {
            _.slideWidth = Math.ceil(_.listWidth);
            _.$slideTrack.height(Math.ceil((_.$slides.first().outerHeight(true) * _.$slideTrack.children('.slick-slide').length)));
        }

        var offset = _.$slides.first().outerWidth(true) - _.$slides.first().width();// 计算margin, 调整成 slideWidth + offset = outerWidth(true)

        console.log(
            '实际子项宽度_.slideWidth', _.slideWidth - offset,
            ' = 计划(', _.slideWidth,
            ') - 子项[0]box-offset',offset
        );
        // 调整所有子项的宽度统一为 _.slideWidth - offset, 注意的是 _.slideWidth没有更新值而保留窗口宽度/show数量
        if (_.options.variableWidth === false) {
            _.$slideTrack.children('.slick-slide').width(_.slideWidth - offset)
        }

    };

    Slick.prototype.setFade = function() {

        var _ = this,
            targetLeft;

        _.$slides.each(function(index, element) {
            targetLeft = (_.slideWidth * index) * -1;
            if (_.options.rtl === true) {
                $(element).css({
                    position: 'relative',
                    right: targetLeft,// 全部靠右边
                    top: 0,
                    zIndex: _.options.zIndex - 2,
                    opacity: 0
                });
            } else {
                $(element).css({
                    position: 'relative',
                    left: targetLeft,// 全部靠左边
                    top: 0,
                    zIndex: _.options.zIndex - 2,
                    opacity: 0
                });
            }
        });

        _.$slides.eq(_.currentSlide).css({// fade的效果opacity:1, z-index提升
            zIndex: _.options.zIndex - 1,
            opacity: 1
        });

    };

    Slick.prototype.setHeight = function() {

        var _ = this;

        if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false) {
            var targetHeight = _.$slides.eq(_.currentSlide).outerHeight(true);
            _.$list.css('height', targetHeight);
        }

    };

    Slick.prototype.setOption = Slick.prototype.slickSetOption = function(option, value, refresh) {

        var _ = this, l, item;

        if( option === "responsive" && $.type(value) === "array" ) {
            for ( item in value ) {
                if( $.type( _.options.responsive ) !== "array" ) {
                    _.options.responsive = [ value[item] ];
                } else {
                    l = _.options.responsive.length-1;
                    // loop through the responsive object and splice out duplicates.
                    while( l >= 0 ) {
                        if( _.options.responsive[l].breakpoint === value[item].breakpoint ) {
                            _.options.responsive.splice(l,1);
                        }
                        l--;
                    }
                    _.options.responsive.push( value[item] );
                }
            }
        } else {
            _.options[option] = value;
        }

        if (refresh === true) {
            _.unload();
            _.reinit();
        }

    };

    Slick.prototype.setPosition = function() {
        // 布局:  不是滑动切换的动画, 是最后的重新布局而已
        // 不传参位置,
        // 1, 重新计算$list, $slideTrack, $slides布局
        // 2, 根据当前组件的属性currentSlide来css(transform)排位
        var _ = this;

        _.setDimensions();// 为何频繁执行尺寸的调整?

        _.setHeight();

        if (_.options.fade === false) {
            _.setCSS(_.getLeft(_.currentSlide));
        } else {
            _.setFade();
        }

        _.$slider.trigger('setPosition', [_]);

    };

    Slick.prototype.setProps = function() {
        // 设置属性, 作者的经验逻辑?
        // 设置使用的方法, 决定组件使用.css()方法或translate方法或translate3d方法
        var _ = this,
            bodyStyle = document.body.style;

        _.positionProp = _.options.vertical === true ? 'top' : 'left';

        if (_.positionProp === 'top') {
            _.$slider.addClass('slick-vertical');
        } else {
            _.$slider.removeClass('slick-vertical');
        }


        if (bodyStyle.WebkitTransition !== undefined ||
            bodyStyle.MozTransition !== undefined ||
            bodyStyle.msTransition !== undefined) {
            if (_.options.useCSS === true) { //options是提供用户的选择, 但要使用的话, 需检测环境能否
                _.cssTransitions = true;
            }
        }

        if ( _.options.fade ) {
            if ( typeof _.options.zIndex === 'number' ) {
                if( _.options.zIndex < 3 ) {
                    _.options.zIndex = 3;
                }
            } else {
                _.options.zIndex = _.defaults.zIndex;
            }
        }
        /*setProps的主要作用之一:检测可使用的前缀, 可以用来借鉴, Perspective更小众*/
        if (bodyStyle.OTransform !== undefined) {
            _.animType = 'OTransform';
            _.transformType = '-o-transform';
            _.transitionType = 'OTransition';
            if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false;
        }
        if (bodyStyle.MozTransform !== undefined) {
            _.animType = 'MozTransform';
            _.transformType = '-moz-transform';
            _.transitionType = 'MozTransition';
            if (bodyStyle.perspectiveProperty === undefined && bodyStyle.MozPerspective === undefined) _.animType = false;
        }
        if (bodyStyle.webkitTransform !== undefined) {
            _.animType = 'webkitTransform';
            _.transformType = '-webkit-transform';
            _.transitionType = 'webkitTransition';
            if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false;
        }
        if (bodyStyle.msTransform !== undefined) {
            _.animType = 'msTransform';
            _.transformType = '-ms-transform';
            _.transitionType = 'msTransition';
            if (bodyStyle.msTransform === undefined) _.animType = false;
        }
        if (bodyStyle.transform !== undefined && _.animType !== false) {
            _.animType = 'transform';
            _.transformType = 'transform';
            _.transitionType = 'transition';
        }
        _.transformsEnabled = _.options.useTransform && (_.animType !== null && _.animType !== false);
    };


    Slick.prototype.setSlideClasses = function(index) {
        // 添加显示子项的class:
        // slick-active : 窗口显示的子项
        // slick-center : 居中模式中居中的子项
        // slick-current: 窗口左侧的子项

        var _ = this,
            centerOffset, allSlides, indexOffset, remainder;

        allSlides = _.$slider// 获取所有包括cloned在内的子项, 清空这三类class并隐藏
            .find('.slick-slide')
            .removeClass('slick-active slick-center slick-current')
            .attr('aria-hidden', 'true');

        console.log('setSlideClasses : 所有子项allSlides.length', allSlides.length, '=', _.options.slidesToShow, '*2 +', _.$slides.length);
        //log('current index', index = 0 + _.options.slidesToScroll * 13);


        _.$slides
            .eq(index)
            .addClass('slick-current');

        if (_.options.centerMode === true) {
            // 居中模式, Index的子项居中

            centerOffset = Math.floor(_.options.slidesToShow / 2);

            if (_.options.infinite === true) {
                /*slick-active*/
                if (index >= centerOffset && index <= (_.slideCount - 1) - centerOffset) {
                    // 当index在不需要cloned显示的队列中

                    _.$slides
                        .slice(index - centerOffset, index + centerOffset + 1)
                        .addClass('slick-active')
                        .attr('aria-hidden', 'false');

                } else {
                    // cloned在显示范围
                    indexOffset = _.options.slidesToShow + index;
                    allSlides
                        .slice(indexOffset - centerOffset + 1, indexOffset + centerOffset + 2)
                        .addClass('slick-active')
                        .attr('aria-hidden', 'false');

                }
                /*slick-center   ?? */
                if (index === 0) {

                    allSlides
                        .eq(allSlides.length - 1 - _.options.slidesToShow)
                        .addClass('slick-center');

                } else if (index === _.slideCount - 1) {

                    allSlides
                        .eq(_.options.slidesToShow)
                        .addClass('slick-center');

                }

            }
            // 除了index === 0与index === _.slideCount - 1外都是以Index为slick-center
            // 所以cloned是没有slick-center的, cloned是用作infinite的
            _.$slides
                .eq(index)
                .addClass('slick-center');

        } else {
            // 非居中模式
            // 不用考虑infinite?

            if (index >= 0 && index <= (_.slideCount - _.options.slidesToShow)) {
                // 不显示cloned情况
                _.$slides
                    .slice(index, index + _.options.slidesToShow)
                    .addClass('slick-active')
                    .attr('aria-hidden', 'false');

            } else if (allSlides.length <= _.options.slidesToShow) {

                allSlides
                    .addClass('slick-active')
                    .attr('aria-hidden', 'false');

            } else {
                // 最后显示cloned的一轮或两轮
                // 因为第一轮:非循环的是不设cloned左拉无效, 循环的是调到最后一轮的显示(不是最后dots按钮显示)

                remainder = _.slideCount % _.options.slidesToShow;
                // 轮播到最后(也就是dots最后button显示)(由于滚动切换以slidestoscroll为准)的显示cloned个数
                // 以slidesToShow为准的剩余个数
                indexOffset = _.options.infinite === true ? _.options.slidesToShow + index : index;
                // indexOffset: index是以$slides为基础 == indexOffset以Allslides为基础
                //console.error(remainder,_.options.slidesToShow + index, _.options.slidesToShow, index);

                if (_.options.slidesToShow == _.options.slidesToScroll && (_.slideCount - index) < _.options.slidesToShow) {
                    // slidesToShow = slidesToScroll时currentslide可能靠左, 所以slick-active在currentslide左右都有.
                    allSlides
                        .slice(indexOffset - (_.options.slidesToShow - remainder), indexOffset + remainder)
                        .addClass('slick-active')
                        .attr('aria-hidden', 'false');

                } else {

                    allSlides
                        .slice(indexOffset, indexOffset + _.options.slidesToShow)
                        .addClass('slick-active')
                        .attr('aria-hidden', 'false');

                }

            }

        }

        if (_.options.lazyLoad === 'ondemand') {
            _.lazyLoad();
        }

    };

    Slick.prototype.setupInfinite = function() {
        // 生成滚动的无限循环效果的基础 html
        // slideToShow:展示个数:S个
        // 无centerMode的Infinite模式: 在[0]前复制出S个单元, 在[end]后复制出S个单元
        // centerMode的Infinite模式: 特别之处是slidesToshow大于1的情况就调整展示单元数量为单数, 初始化[0]集中,[end]靠左
        // fade模式的话就不lazyLoad用生成html了

        // 问题setupInfinite要跑第二次才真正完善复制
        var _ = this,
            i, slideIndex, infiniteCount;

        if (_.options.fade === true) {
            _.options.centerMode = false;// fade与centerMode不能同时使用, fade优先
        }

        if (_.options.infinite === true && _.options.fade === false) {

            slideIndex = null;

            if (_.slideCount > _.options.slidesToShow) {// 满足切换数量条件下

                if (_.options.centerMode === true) {
                    infiniteCount = _.options.slidesToShow + 1;
                } else {
                    infiniteCount = _.options.slidesToShow;
                }

                for (i = _.slideCount; i > (_.slideCount - infiniteCount); i -= 1) {
                    slideIndex = i - 1;
                    $(_.$slides[slideIndex])
                        .clone(true)
                        .attr('id', '')
                        .attr('data-slick-index', slideIndex - _.slideCount)
                        .prependTo(_.$slideTrack)
                        .addClass('slick-cloned');// 复制清空id并添加data-slick-index类slick-cloned之后prepend
                }
                for (i = 0; i < infiniteCount; i += 1) {
                    slideIndex = i;
                    $(_.$slides[slideIndex])
                        .clone(true)
                        .attr('id', '')
                        .attr('data-slick-index', slideIndex + _.slideCount)
                        .appendTo(_.$slideTrack)
                        .addClass('slick-cloned');
                }
                _.$slideTrack.find('.slick-cloned').find('[id]').each(function() {
                    $(this).attr('id', '');
                });

            }

        }

    };

    Slick.prototype.setPaused = function(paused) {
        // 意义clearInterval
        var _ = this;

        if (_.options.autoplay === true && _.options.pauseOnHover === true) {
            _.paused = paused;
            if (!paused) {
                _.autoPlay();
            } else {
                _.autoPlayClear();
            }
        }
    };

    Slick.prototype.selectHandler = function(event) {

        var _ = this;

        var targetElement =
            $(event.target).is('.slick-slide') ?
                $(event.target) :
                $(event.target).parents('.slick-slide');

        var index = parseInt(targetElement.attr('data-slick-index'));

        if (!index) index = 0;

        if (_.slideCount <= _.options.slidesToShow) {

            _.setSlideClasses(index);
            _.asNavFor(index);
            return;

        }

        _.slideHandler(index);

    };

    Slick.prototype.slideHandler = function(index, sync, dontAnimate) {
        // 核心控件： 执行切换
        // @paramter:@index是目标子项, @sync??, @dontAnimate是动画效果
        // 保险措施， 循环措施， 调用动画执行切换
        var targetSlide, animSlide, oldSlide, slideLeft, targetLeft = null,
            _ = this;

        sync = sync || false;

        if (_.animating === true && _.options.waitForAnimate === true) {// 运动中 && 等待运动
            return;
        }

        if (_.options.fade === true && _.currentSlide === index) {// 非fade模式 && 不重复执行
            return;
        }

        if (_.slideCount <= _.options.slidesToShow) {
            return;
        }

        if (sync === false) {
            //console.warn('不明白为何要这样_.asNavFor(index)');
            _.asNavFor(index);
        }

        targetSlide = index;
        targetLeft = _.getLeft(targetSlide);// !!!计算目标的左偏移
        slideLeft = _.getLeft(_.currentSlide);// !!!重新计算当前子项的左偏移

        _.currentLeft = _.swipeLeft === null ? slideLeft : _.swipeLeft;// 优先处理触控滑动的
        if(_.swipeLeft !== null){
            console.log('触控滑动, swipeLeft', _.swipeLeft);
        }

        /*非循环模式的保险措施*/ // 并ruturn跳出
        if (_.options.infinite === false && _.options.centerMode === false && (index < 0 || index > _.getDotCount() * _.options.slidesToScroll)) {
            if (_.options.fade === false) {
                targetSlide = _.currentSlide;// 撞墙了,不可能实现的,所以目标子项改为当前子项
                console.error('不居中不循环模式中的 撞墙节点 实施targetSlide', targetSlide,'  计划index',index);
                if (dontAnimate !== true) {// 值得学习, 不传参就undefined,即默认是false
                    _.animateSlide(slideLeft, function() {
                        _.postSlide(targetSlide);
                    });
                } else {
                    _.postSlide(targetSlide);
                }
            }
            return;
        } else if (_.options.infinite === false && _.options.centerMode === true && (index < 0 || index > (_.slideCount - _.options.slidesToScroll))) {
            if (_.options.fade === false) {
                targetSlide = _.currentSlide;// 撞墙了,不可能实现的,所以目标子项改为当前子项
                console.error('不居中不循环模式中的 撞墙节点 实施targetSlide', targetSlide,'  计划index',index);
                if (dontAnimate !== true) {
                    _.animateSlide(slideLeft, function() {
                        _.postSlide(targetSlide);
                    });
                } else {
                    _.postSlide(targetSlide);
                }
            }
            return;
        }

        if (_.options.autoplay === true) {
            clearInterval(_.autoPlayTimer);
        }

        /*循环的措施*/
        // 不断循环的关键点:调整targetSlide回到开头, 但不是修改_.slideCount
        // 因为需要_.slideCount来滚动动画, 而targetSlide是动画后的位置矫正
        if (targetSlide < 0) {
            console.error('(targetSlide < 0)', targetSlide);
            if (_.slideCount % _.options.slidesToScroll !== 0) {

                animSlide = _.slideCount - (_.slideCount % _.options.slidesToScroll);
            } else {
                animSlide = _.slideCount + targetSlide;
            }
            console.error('(targetSlide < 0)', targetSlide , ' 调整目标animSlide', animSlide);
        } else if (targetSlide >= _.slideCount) {
            // 这是一般遇见的措施: 由左往右
            // 当跳转的目标>slideCount, 定位的目标 = 0, 回到开头
            if (_.slideCount % _.options.slidesToScroll !== 0) {
                animSlide = 0;
            } else {
                animSlide = targetSlide - _.slideCount;// 不都是一样等于0么?多余
            }
            console.error('(targetSlide >= _.slideCount)', targetSlide , ' 调整目标animSlide', animSlide);
        } else {
            // 一般的情况不需要处理循环措施: 所以定位的目标 = 跳转的目标
            animSlide = targetSlide;
        }

        _.animating = true;// 开始动画

        _.$slider.trigger('beforeChange', [_, _.currentSlide, animSlide]);// 提供触发事件beforeChange

        oldSlide = _.currentSlide;
        _.currentSlide = animSlide;// 调整当前子项为定位子项并保存

        _.setSlideClasses(_.currentSlide);
        // 未开始动画, 先设定好class, 特别最后一轮的情况: 跳转cloned前, currentslide已经是[0],
        // 这就是编程! 视觉效果不主导编程, 这里很好说明, 在动画前就已经执行好了实际的调位, 数据先运算完, 后面的只是动画的过程.

        _.updateDots();
        _.updateArrows();

        if (_.options.fade === true) {
            if (dontAnimate !== true) {

                _.fadeSlideOut(oldSlide);

                _.fadeSlide(animSlide, function() {
                    _.postSlide(animSlide);
                });

            } else {
                _.postSlide(animSlide);
            }
            _.animateHeight();
            return;
        }

        if (dontAnimate !== true) {
            console.error('运算 执行动画 目标子项位置是',targetLeft, '计算数量是',targetLeft / _.slideWidth + _.options.slidesToScroll);
            _.animateSlide(
                // 传参不是当前子项位置, 也不是定位目标的位置, 而是原计划目标子项位置
                targetLeft,
                // callback 执行定位方法 -->定位目标animSlide
                function() {_.postSlide(animSlide);}

                // 跳转是自由的, 但定位是理性的
            );
        } else {
            _.postSlide(animSlide);
        }

    };

    Slick.prototype.startLoad = function() {

        var _ = this;
        // 不安全的hide, 建议加class隐藏
        if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {

            _.$prevArrow.hide();
            _.$nextArrow.hide();

        }

        if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

            _.$dots.hide();

        }

        _.$slider.addClass('slick-loading');

    };

    Slick.prototype.swipeDirection = function() {

        var xDist, yDist, r, swipeAngle, _ = this;

        xDist = _.touchObject.startX - _.touchObject.curX;
        yDist = _.touchObject.startY - _.touchObject.curY;
        r = Math.atan2(yDist, xDist);
        // Math.atan2(y,x)返回从 x 轴到点 (x,y) 之间的角度。

        swipeAngle = Math.round(r * 180 / Math.PI);// 转为角度数据
        // 拉动的角度没有正负之分, 只有数据上的正负, 所以需要转换负数为正数
        if (swipeAngle < 0) {
            swipeAngle = 360 - Math.abs(swipeAngle);
            // Math.abs(x)返回x的绝对值
        }

        // 0~45度以内||315~360度以内为右拉
        if ((swipeAngle <= 45) && (swipeAngle >= 0)) {
            return (_.options.rtl === false ? 'left' : 'right');
        }
        if ((swipeAngle <= 360) && (swipeAngle >= 315)) {
            return (_.options.rtl === false ? 'left' : 'right');
        }
        // 135~225度以内||35~135度以内为右拉
        if ((swipeAngle >= 135) && (swipeAngle <= 225)) {
            return (_.options.rtl === false ? 'right' : 'left');
        }
        if (_.options.verticalSwiping === true) {
            if ((swipeAngle >= 35) && (swipeAngle <= 135)) {
                return 'left';
            } else {
                return 'right';
            }
        }
        // 理解: 仰角俯角不超45度, 为水平方向

        return 'vertical';

    };

    Slick.prototype.swipeEnd = function(event) {

        var _ = this,
            slideCount;

        _.dragging = false; // 关闭拖拉

        _.shouldClick = (_.touchObject.swipeLength > 10) ? false : true;

        if (_.touchObject.curX === undefined) {
            return false;// 检测当前数据没有就关闭! 安全措施
        }

        if (_.touchObject.edgeHit === true) {
            _.$slider.trigger('edge', [_, _.swipeDirection()]);
            // 即使知道是撞墙也没有return false, 可知: 处理拉动效果是swipestart/swipemove/swipeend的任务, 其他如撞墙后的切换显示则不是他们的责任
        }

        if (_.touchObject.swipeLength >= _.touchObject.minSwipe) {

            switch (_.swipeDirection()) {// 当前获取的方向为准
                case 'left':
                    slideCount = _.options.swipeToSlide ? _.checkNavigable(_.currentSlide + _.getSlideCount()) : _.currentSlide + _.getSlideCount();
                    _.slideHandler(slideCount);
                    _.currentDirection = 0;
                    _.touchObject = {};
                    _.$slider.trigger('swipe', [_, 'left']);
                    break;

                case 'right':
                    slideCount = _.options.swipeToSlide ? _.checkNavigable(_.currentSlide - _.getSlideCount()) : _.currentSlide - _.getSlideCount();
                    _.slideHandler(slideCount);
                    _.currentDirection = 1;
                    _.touchObject = {};
                    _.$slider.trigger('swipe', [_, 'right']);
                    break;
            }
        } else {
            if (_.touchObject.startX !== _.touchObject.curX) {
                _.slideHandler(_.currentSlide);
                _.touchObject = {};
            }
        }

    };

    Slick.prototype.swipeHandler = function(event) {

        var _ = this;

        if ((_.options.swipe === false) || ('ontouchend' in document && _.options.swipe === false)) {
            return;
        } else if (_.options.draggable === false && event.type.indexOf('mouse') !== -1) {
            return;
        }
        //console.log('swipeHandler --> touchObject  -->', _.touchObject);
        _.touchObject.fingerCount = event.originalEvent && event.originalEvent.touches !== undefined ?
            event.originalEvent.touches.length : 1;// 检测到event.originalEvent.touches功能才保存触控数量，否则默认是单点触控。

        _.touchObject.minSwipe = _.listWidth / _.options.touchThreshold;// 临界值

        if (_.options.verticalSwiping === true) {
            _.touchObject.minSwipe = _.listHeight / _.options
                .touchThreshold;
        }

        switch (event.data.action) {

            case 'start':
                _.swipeStart(event);
                break;

            case 'move':
                _.swipeMove(event);
                break;

            case 'end':
                _.swipeEnd(event);
                break;

        }

    };

    Slick.prototype.swipeMove = function(event) {

        var _ = this,
            edgeWasHit = false,
            curLeft, swipeDirection, swipeLength, positionOffset, touches;

        // 先检测event.originalEvent.touches
        touches = event.originalEvent !== undefined ? event.originalEvent.touches : null;

        if (!_.dragging || touches && touches.length !== 1) {
            return false;
        }

        // 获取相对偏移
        curLeft = _.getLeft(_.currentSlide);

        // 获取并更新 起点位置
        _.touchObject.curX = touches !== undefined ? touches[0].pageX : event.clientX;
        _.touchObject.curY = touches !== undefined ? touches[0].pageY : event.clientY;

        _.touchObject.swipeLength = Math.round(Math.sqrt(
            Math.pow(_.touchObject.curX - _.touchObject.startX, 2)));

        if (_.options.verticalSwiping === true) {
            _.touchObject.swipeLength = Math.round(Math.sqrt(
                Math.pow(_.touchObject.curY - _.touchObject.startY, 2)));
            // Math.pow(x,y) 返回x的y次方
            // Math.sqrt(x) 返回x的平方根
            // Math.round 四舍五入
            // 意义? 不是简单的为了绝对值?
        }

        swipeDirection = _.swipeDirection();

        if (swipeDirection === 'vertical') {
            return;
        }

        if (event.originalEvent !== undefined && _.touchObject.swipeLength > 4) {// 4个像素点? 什么?
            event.preventDefault();// 取消默认行为? 指的是点击图片的链接么?
        }

        positionOffset = (_.options.rtl === false ? 1 : -1) * (_.touchObject.curX > _.touchObject.startX ? 1 : -1);
        if (_.options.verticalSwiping === true) {
            positionOffset = _.touchObject.curY > _.touchObject.startY ? 1 : -1;
        }
        // positionOffset: 正反方向

        swipeLength = _.touchObject.swipeLength;

        _.touchObject.edgeHit = false;

        /*保险措施*/
        if (_.options.infinite === false) {
            // 非循环的碰墙操作
            if ((_.currentSlide === 0 && swipeDirection === 'right') || (_.currentSlide >= _.getDotCount() && swipeDirection === 'left')) {
                swipeLength = _.touchObject.swipeLength * _.options.edgeFriction;// Friction摩擦,冲突
                _.touchObject.edgeHit = true;
            }
        }

        if (_.options.vertical === false) {
            _.swipeLeft = curLeft + swipeLength * positionOffset;
            // 计算$track的目标定位
        } else {
            _.swipeLeft = curLeft + (swipeLength * (_.$list.height() / _.listWidth)) * positionOffset;
            // 垂直模式下的拉动按窗口宽高比例而缩放
        }
        if (_.options.verticalSwiping === true) {
            _.swipeLeft = curLeft + swipeLength * positionOffset;
        }

        if (_.options.fade === true || _.options.touchMove === false) {
            return false;
        }

        if (_.animating === true) {
            _.swipeLeft = null;
            return false;
        }
        //console.error('动画开始----------------------');
        _.setCSS(_.swipeLeft);

    };

    Slick.prototype.swipeStart = function(event) {

        var _ = this,
            touches;

        if (_.touchObject.fingerCount !== 1 || _.slideCount <= _.options.slidesToShow) {
            // 必须单点触控且...
            _.touchObject = {};// 清空数据
            return false;
        }

        if (event.originalEvent !== undefined && event.originalEvent.touches !== undefined) {
            // 获取原生事件对象，并在原生事件对象有touches属性的情况下
            touches = event.originalEvent.touches[0];// 获取开始点
        }

        _.touchObject.startX = _.touchObject.curX = touches !== undefined ? touches.pageX : event.clientX;
        _.touchObject.startY = _.touchObject.curY = touches !== undefined ? touches.pageY : event.clientY;

        _.dragging = true;
        console.error('swipeStart touches 记录数据',_.touchObject);

    };

    Slick.prototype.unfilterSlides = Slick.prototype.slickUnfilter = function() {

        var _ = this;

        if (_.$slidesCache !== null) {

            _.unload();

            _.$slideTrack.children(this.options.slide).detach();

            _.$slidesCache.appendTo(_.$slideTrack);

            _.reinit();

        }

    };

    Slick.prototype.unload = function() {

        var _ = this;

        $('.slick-cloned', _.$slider).remove();

        if (_.$dots) {
            _.$dots.remove();
        }

        if (_.$prevArrow && _.htmlExpr.test(_.options.prevArrow)) {
            _.$prevArrow.remove();
        }

        if (_.$nextArrow && _.htmlExpr.test(_.options.nextArrow)) {
            _.$nextArrow.remove();
        }

        _.$slides
            .removeClass('slick-slide slick-active slick-visible slick-current')
            .attr('aria-hidden', 'true')
            .css('width', '');

    };

    Slick.prototype.unslick = function(fromBreakpoint) {

        var _ = this;
        _.$slider.trigger('unslick', [_, fromBreakpoint]);
        _.destroy();

    };

    Slick.prototype.updateArrows = function() {

        var _ = this,
            centerOffset;

        centerOffset = Math.floor(_.options.slidesToShow / 2);

        if ( _.options.arrows === true &&
            _.slideCount > _.options.slidesToShow &&
            !_.options.infinite ) {

            _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');
            _.$nextArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');

            if (_.currentSlide === 0) {

                _.$prevArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
                _.$nextArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');

            } else if (_.currentSlide >= _.slideCount - _.options.slidesToShow && _.options.centerMode === false) {

                _.$nextArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
                _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');

            } else if (_.currentSlide >= _.slideCount - 1 && _.options.centerMode === true) {

                _.$nextArrow.addClass('slick-disabled').attr('aria-disabled', 'true');
                _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false');

            }

        }

    };

    Slick.prototype.updateDots = function() {

        var _ = this;

        if (_.$dots !== null) {

            _.$dots
                .find('li')
                .removeClass('slick-active')
                .attr('aria-hidden', 'true');

            _.$dots
                .find('li')
                .eq(Math.floor(_.currentSlide / _.options.slidesToScroll))
                .addClass('slick-active')
                .attr('aria-hidden', 'false');

        }

    };

    Slick.prototype.visibility = function() {

        var _ = this;

        if (document[_.hidden]) {
            _.paused = true;
            _.autoPlayClear();
        } else {
            if (_.options.autoplay === true) {
                _.paused = false;
                _.autoPlay();
            }
        }

    };
    Slick.prototype.initADA = function() {
        var _ = this;
        _.$slides.add(_.$slideTrack.find('.slick-cloned')).attr({
            'aria-hidden': 'true',
            'tabindex': '-1'
        }).find('a, input, button, select').attr({
            'tabindex': '-1'
        });

        _.$slideTrack.attr('role', 'listbox');

        _.$slides.not(_.$slideTrack.find('.slick-cloned')).each(function(i) {
            $(this).attr({
                'role': 'option',
                'aria-describedby': 'slick-slide' + _.instanceUid + i + ''
            });
        });

        if (_.$dots !== null) {
            _.$dots.attr('role', 'tablist').find('li').each(function(i) {
                $(this).attr({
                    'role': 'presentation',
                    'aria-selected': 'false',
                    'aria-controls': 'navigation' + _.instanceUid + i + '',
                    'id': 'slick-slide' + _.instanceUid + i + ''
                });
            })
                .first().attr('aria-selected', 'true').end()
                .find('button').attr('role', 'button').end()
                .closest('div').attr('role', 'toolbar');
        }
        _.activateADA();

    };

    Slick.prototype.activateADA = function() {
        var _ = this;

        _.$slideTrack.find('.slick-active').attr({
            'aria-hidden': 'false'
        }).find('a, input, button, select').attr({
            'tabindex': '0'
        });

    };

    Slick.prototype.focusHandler = function() {
        var _ = this;
        _.$slider.on('focus.slick blur.slick', '*', function(event) {
            event.stopImmediatePropagation();
            var sf = $(this);
            setTimeout(function() {
                if (_.isPlay) {
                    if (sf.is(':focus')) {
                        _.autoPlayClear();
                        _.paused = true;
                    } else {
                        _.paused = false;
                        _.autoPlay();
                    }
                }
            }, 0);
        });
    };

    $.fn.slick = function() {
        var _ = this,
            opt = arguments[0],// 获取传入参数,不用管什么对象了
            args = Array.prototype.slice.call(arguments, 1),
            l = _.length,
            i,
            ret;
        for (i = 0; i < l; i++) {
            if (typeof opt == 'object' || typeof opt == 'undefined')
                _[i].slick = new Slick(_[i], opt);
            else
                ret = _[i].slick[opt].apply(_[i].slick, args);
            if (typeof ret != 'undefined') return ret;
        }
        return _;
    };

}));
