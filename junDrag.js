// 基于jQuery库开发

// 分析事件:
// 长按按钮达到一定程度 -> 实现拖动 -> 拖动效果...
// 拖动状态时候, 触控点的位置差生新的空白格(先忽略动画效果), li重新排序(动画效果先忽略)
// 放开触控, 判断触控点位置, 移除空白格, 重新排位(先忽略动画效果)

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

	function YCdrag(options) {

		var defalutOptions = {
			Container: '.junDrag',
			Item:"li",
			timeDuration: 250,
			// 设置
			useTransform: true, // <1>
			useCSS: true
		};

		// 关于动画效果的设置
		var settings = {

			// 位置保存:
			positionProp : {left: null, top: null},
			// 属性
			cssTransitions:null, // <1>
			transformsEnabled:null,
			// css属性前缀
			transitionType:null,
			transformType:null,
			animType:null
		};

		$.extend(this, settings);

		this.options = $.extend({}, defalutOptions, options);

		console.log('options = ', options);

		this.setProps();

		this.init();
	}

	YCdrag.prototype.setProps = function() {
		// 检测判断:
		// cssTransitions
		// 设置前缀:
		// animType/ transformType/ transitionType
		// 检测判断:
		// transformsEnabled = 根据useTransform正反基础, 检测animType不为null与false

		var _ = this,
			bodyStyle = document.body.style;

		if (bodyStyle.WebkitTransition !== undefined ||
			bodyStyle.MozTransition !== undefined ||
			bodyStyle.msTransition !== undefined) {
			if (_.options.useCSS === true) { //options是提供用户的选择, 但要使用的话, 需检测环境能否
				_.cssTransitions = true;
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

	YCdrag.prototype.setCSS = function(position) {
		// position = {left: ?, top: ?}
		var _ = this,
			positionProps = {},
			x, y;

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



	function setProps () {
		// 设置使用的方法, 决定组件使用.css()方法或translate方法或translate3d方法
		var _ = this,
			bodyStyle = document.body.style;

		if (bodyStyle.WebkitTransition !== undefined ||
			bodyStyle.MozTransition !== undefined ||
			bodyStyle.msTransition !== undefined) {
			if (_.options.useCSS === true) { //options是提供用户的选择, 但要使用的话, 需检测环境能否
				_.cssTransitions = true;
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

	window.junDrag = function(options){

		var defalutOptions = {
			Container: '.junDrag',
			Item:"li",
			timeDuration: 250,
			useCSS: true,// Enable/Disable CSS Transitions 是否使用translate3d
			useTransform: true// 是否使用transform的CSS功能, translate 否则使用.css()方法而已
		};

		options = $.extend({}, defalutOptions, options);

		console.log('options', options);

		/*初始化动画环境, 本部分可以在插件里完成并获取, 不必要在这里执行方法*/

		/*动画环境END*/



		// options
		var $ul = $(options.Container),
			$li = $ul.find(options.Item);

		// 选择事件类型
		var hasTouch = 'ontouchstart' in window ,
			startEvent = hasTouch ? 'touchstart' : 'mousedown',
			stopEvent = hasTouch ? 'touchend touchcancel' : 'mouseup mouseleave',
			moveEvent = hasTouch ? 'touchmove' : 'mousemove';


		// 方法: 获取触控点坐标
		function page(coord, event) {
			return (hasTouch ? event.originalEvent.touches[0] : event)['page' + coord.toUpperCase()];
		}

		// 布局变量记录:
		var setTimeoutDrag, eventStartX, eventStartY;

		// moveEvent的位置
		var moveTargetIndex;
		var MEMOmoveTargetIndex;

		// startEvent的位置
		var startTargetIndex;

		// 获取子项li尺寸
		var liH = $li.outerHeight(true), liW = $li.outerWidth(true);
		//获取容器ul尺寸
		var ulH = $ul.height(),ulW = $ul.width();

		// 计算ul排列了多少列,与项
		var rows = Math.floor(ulH/liH); // 最准确的数字
		var cols;
		var linums = $li.length;
		// 遍历方法来计算列数
		for(var i = 0; i<linums; i++){
			if($li.eq(i).position().top > 1){
				cols = i;
				break
			}
		}
		console.log('ul data : rows = ', rows, ', cols = ', cols);

		// 计算第一个li的页面坐标, 以此作为参考基准
		var li_1_top = $li.eq(0).offset().top;
		var li_1_left = $li.eq(0).offset().left;

		// 绑定事件startEvent
		$li.on(startEvent,function(event){

			var $this = $(this);

			startTargetIndex = $this.addClass('active').index();

			//startTime = event.timeStamp || +new Date();

			// 记录初始位置
			eventStartX = page('x', event);
			eventStartY = page('y', event);

			// 设定触发拖拉事件
			setTimeoutDrag = setTimeout(function(){drag(event, $this)}, options.timeDuration);

			// 绑定事件stopEvent
			$('body').one(stopEvent, function(){
				$ul.find('li').removeClass('active').css('opacity',1); // 此处应优化动画效果
				$ul.find('.clone').remove(); // 此处应优化动画效果
				clearTimeout(setTimeoutDrag);
				$('body').off(moveEvent);
				// 监听触控点位置, 在ul插入本对象li
			});
		});

		var drag = function(event, $this){
			// 需要重新获取$li, 不然出现Bug: 多次排序出错
			$li = $ul.find(options.Item);

			/*动画效果放大对象*/
			//...

			// 虚拟:
			$this.css('opacity',.3);

			/* 脱离文本流 */
			// 获取点击对象的相对父级的位置
			var thisPos = $this.position();

			// 改变目标的定位, 脱离文本流

			var $cloneone = $this.clone().addClass('clone').css({'opacity':1,'position':'absolute', 'font-size':'60px','left':thisPos.left, 'top':thisPos.top, 'z-index': 99});

			$ul.append($cloneone);

			/* 计算鼠标相对于对象左上角的坐标XY */
			// 获取对象先对窗口的坐标XY
			var tx = $this.offset().left, ty = $this.offset().top;
			// 计算鼠标相对于对象左上角的坐标XY
			var eX = eventStartX - tx, eY = eventStartY - ty;

			// 计算每个子项的定位
			// pageXY位置为准, 所以取值offsetXY, 加上li自身尺寸作为范围值,
			// 然后进行moveEvent时候, 检测e.pageXY位置, 然后遍历每个子项的位置, 对比后获取当今位置

			$('body').on(moveEvent, function(event){
				var Move_ex = page('x', event), Move_ey = page('y', event);
				$cloneone.css({'left':Move_ex - eX, 'top':Move_ey - eY});// 此处应优化动画

				// 监听触控点位置来插入空白格子
				// 思路1
				// 以event触控点坐标来计算触控点所在的li的序号
				// 以把startTarget使用after/before的方法来插入到ul的指定序号

				var check_ex = Move_ex - li_1_left;
				var check_ey = Move_ey - li_1_top;
				// 以check_ex, check_ey为触控点来检测触控点所在位置
				// 限定方法仅发生在ul范围
				if(
					check_ex > 0 && check_ey > 0 &&
					check_ex < ulW && check_ey < ulH
				){
					// 计算触控点的位置index
					var curCol = Math.floor(check_ex/liW) + 1;
					var curRow = Math.floor(check_ey/liH);
					moveTargetIndex = curRow * cols + curCol - 1;

					// 位移未超出一个li位置, 就取消执行
					if(MEMOmoveTargetIndex == moveTargetIndex){ return }

					if(moveTargetIndex < startTargetIndex){
						$li.eq(moveTargetIndex).before($this);
					}else if(moveTargetIndex > startTargetIndex){
						$li.eq(moveTargetIndex).after($this);
					}else if(moveTargetIndex == startTargetIndex){
						$li.eq(moveTargetIndex - 1).after($this);
					}

				}
				// 记录本次位置
				MEMOmoveTargetIndex = moveTargetIndex;
			});
		};


		/*其他*/

// 标题显示  底层事件类型
		$('.junDragtittle').text('startEvent : '+ startEvent);
	}
}));

