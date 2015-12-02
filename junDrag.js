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

	// 这一句没有写好
	var hasTouch = 'ontouchstart' in window ;

	// 方法: 获取触控点坐标
	var page = function (coord, event) {
		return (hasTouch? event.originalEvent.touches[0] : event)['page' + coord.toUpperCase()];
	};

	//var YCdrag = window.YCdrag || {};
	window.YCdrag = function (options) {

		// 默认选项
		var defalutOptions = {
			Container: '.junDrag',
			Item:"li",
			timeDuration: 300,
			resetDuration: 3000,
			// 动画选项,默认选择translate的CSS效果
			useTransform: true, // <1>
			useCSS: true
		};

		// 关于动画效果的设置
		var thisSettings = {

			// 对象
			$container: null,
			$item: null,
			$dragItem: null,

			// 尺寸属性
			liw: null,
			liH: null,
			ulW: null,
			ulH: null,
			rows: null,
			cols: null,
			li_1_top: null,
			li_1_left: null,

			// 事件类型
			hasTouch: null,
			startEvent: null,
			stopEvent: null,
			moveEvent: null,

			// 事件相关的基本属性
			eventStartX: null,
			eventStartY: null,
			moveTargetIndex: null, // moveEvent的位置
			MEMOmoveTargetIndex: null, // 记录moveEvent的位置
			startTargetIndex: null, // startEvent的位置

			// 定时事件
			setTimeoutDrag: null,

			// CSS属性
			cssTransitions:null, // <1>
			transformsEnabled:null,

			// css属性前缀
			transitionType:null,
			transformType:null,
			animType:null
		};

		$.extend(this, thisSettings);

		this.options = $.extend({}, defalutOptions, options);

		// 添加对象jQuery包装集
		this.$container = $(this.options.Container);
		this.$item = this.$container.find(this.options.Item);

		console.log('options = ', this.options);

		this.init();
	};

	YCdrag.prototype.init = function() {

		this.render();

		this.size();

		this.setProps();

		this.initailizeEvent();

	};

	YCdrag.prototype.render = function(){

	};

	YCdrag.prototype.size = function(){
		// 获取子项li尺寸
		this.liH = this.$item.outerHeight(true);
		this.liW = this.$item.outerWidth(true);

		// 获取容器ul尺寸
		this.ulH = this.$container.height();
		this.ulW = this.$container.width();

		// 计算ul排列了多少列,与项
		this.rows = Math.floor(this.ulH/this.liH); // 最准确的数字
		this.cols;
		// 遍历方法来计算列数
		for(var i = 0; i < this.$item.length; i++){
			if(this.$item.eq(i).position().top > 1){
				this.cols = i;
				break;
			}
		}
		console.log('ul data : rows = ', this.rows, ', cols = ', this.cols);

		// 计算第一个li的页面坐标, 以此作为参考基准
		this.li_1_top = this.$item.eq(0).offset().top;
		this.li_1_left = this.$item.eq(0).offset().left;
	};

	YCdrag.prototype.setProps = function() {
		// 1, 选择事件类型
		// 2, 检测判断:
		// cssTransitions
		// 3, 设置前缀:
		// animType/ transformType/ transitionType
		// 4, 检测判断:
		// transformsEnabled = 根据useTransform正反基础, 检测animType不为null与false

		var _ = this,
			bodyStyle = document.body.style;

		// 选择事件类型
		_.hasTouch = hasTouch ;
		_.startEvent = _.hasTouch ? 'touchstart' : 'mousedown';
		_.stopEvent = _.hasTouch ? 'touchend touchcancel' : 'mouseup mouseleave';
		_.moveEvent = _.hasTouch ? 'touchmove' : 'mousemove';

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
		//_.transformsEnabled = false;// 测试用
	};

	YCdrag.prototype.dragCSS = function(position) {
		// position = {left: ?, top: ?}
		var _ = this,
			positionProps = {},
			x, y;

		if (_.transformsEnabled === false) {
			// css位置, 基于$dragItem是position:relative的基础
			x = Math.ceil(position.left - _.eventStartX + _.dx) + 'px';
			y = Math.ceil(position.top - _.eventStartY + _.dy) + 'px';
			_.$dragItem.css({'left': x, "top": y});
		} else {
			positionProps = {};
			// 这里的原理是不同的, 因为这里使用了位移, 是在原基础上的位移多少, 可以说是直接追踪触控点的距离
			x = Math.ceil(position.left - _.eventStartX) + 'px';
			y = Math.ceil(position.top - _.eventStartY) + 'px';

			if (_.cssTransitions === false) {
				positionProps[_.animType] = 'translate(' + x + ', ' + y + ')';
				_.$dragItem.css(positionProps);
				console.log(positionProps)
			} else {
				positionProps[_.animType] = 'translate3d(' + x + ', ' + y + ', 0px)';
				_.$dragItem.css(positionProps);
				console.log(positionProps)
			}
		}
	};



	YCdrag.prototype.initailizeEvent = function() {
		// 绑定事件startEvent
		var _ = this;

		_.$item.on(_.startEvent, function(event){

			var $this = $(this);

			_.startTargetIndex = $this.addClass('active').index();

			//startTime = event.timeStamp || +new Date();

			// 记录初始位置
			_.eventStartX = page('x', event);
			_.eventStartY = page('y', event);

			// 定时触发拖拉事件
			_.setTimeoutDrag = setTimeout(function(){_.drag(event, $this)}, _.options.timeDuration);

			// 绑定事件stopEvent
			$('body').one(_.stopEvent, function(event){
				_.dragItemReset(event, $this);
				// 监听触控点位置, 在ul插入本对象li
				clearTimeout(_.setTimeoutDrag);
				$('body').off(_.moveEvent);

			});
		});
	};

	YCdrag.prototype.applyTransition = function($dragItem) {
		// 添加css  Transition
		var _ = this,
			transition = {};

		transition[_.transitionType] = _.transformType + ' ' + _.options.resetDuration + 'ms ease';

		$dragItem.css(transition);
	};

	YCdrag.prototype.disableTransition = function($dragItem) {
		// 去掉css  Transition
		var _ = this,
			transition = {};

		transition[_.transitionType] = '';

		$dragItem.css(transition);
	};


	YCdrag.prototype.dragItemReset = function(event, $this){
		// mouseUp动画
		var $item = $this,
			_ = this,
			positionProps= {};

		//var MouseUp_ex = page('x', event),
		//	MouseUp_ey = page('y', event);

		// 获取目标定位
		var targetPos = $item.position();

		var x =  targetPos.left - _.startPos.left,
		y = targetPos.top - _.startPos.top ;

		_.applyTransition(_.$dragItem);
		positionProps[_.animType] = 'translate3d(' + x + 'px, ' + y + 'px, 0px)'; // 测试用, 应调用dragCSS方法
		_.$dragItem.css(positionProps);

		setTimeout(function(){
			_.$container.find('.clone').remove();
			_.$container.find(_.options.Item).removeClass('active host');
			_.disableTransition(_.$dragItem);
		}, _.options.resetDuration);

	};

	YCdrag.prototype.drag = function(event, $this){
		var _ = this;

		// 需要重新获取$item, 不然出现Bug: 多次排序出错
		_.$item = _.$container.find(_.options.Item);

		/*动画效果放大对象*/
		//...

		$this.addClass('host');

		/* 脱离文本流 */
		// 获取点击对象的相对父级的位置
		_.startPos = $this.position();

		// 改变目标的定位, 脱离文本流
		_.$dragItem =
			$this.clone()
				.addClass('clone');

		_.$container.append(_.$dragItem);// Bug: 改变了$container的高度! 但可通过css固定高度

		// 原item与新添加item的距离
		_.dx = $this.position().left - _.$dragItem.position().left;
		_.dy = $this.position().top - _.$dragItem.position().top;

		_.$dragItem.css({'left': _.dx,'top': _.dy});

		// 计算每个子项的定位
		// pageXY位置为准, 所以取值offsetXY, 加上li自身尺寸作为范围值,
		// 然后进行moveEvent时候, 检测e.pageXY位置, 然后遍历每个子项的位置, 对比后获取当今位置

		$('body').on(_.moveEvent, function(event){
			var Move_ex = page('x', event),
				Move_ey = page('y', event);

			_.dragCSS({'left':Move_ex, 'top':Move_ey});
			//_.$dragItem.css({'left':Move_ex - eX, 'top':Move_ey - eY});// 测试用, 没有优化动画的模式

			// 监听触控点位置来插入空白格子
			// 思路1
			// 以event触控点坐标来计算触控点所在的li的序号
			// 以把startTarget使用after/before的方法来插入到ul的指定序号

			var check_ex = Move_ex - _.li_1_left;
			var check_ey = Move_ey - _.li_1_top;
			// 以check_ex, check_ey为触控点来检测触控点所在位置
			// 限定方法仅发生在ul范围
			if(
				check_ex > 0 && check_ey > 0 &&
				check_ex < _.ulW && check_ey < _.ulH
			){
				// 计算触控点的位置index
				var curCol = Math.floor(check_ex/_.liW) + 1;
				var curRow = Math.floor(check_ey/_.liH);
				_.moveTargetIndex = curRow * _.cols + curCol - 1;

				// 位移未超出一个li位置, 就取消执行
				if(_.MEMOmoveTargetIndex == _.moveTargetIndex){ return }

				if(_.moveTargetIndex < _.startTargetIndex){
					_.$item.eq(_.moveTargetIndex).before($this);
				}else if(_.moveTargetIndex > _.startTargetIndex){
					_.$item.eq(_.moveTargetIndex).after($this);
				}else if(_.moveTargetIndex == _.startTargetIndex){
					_.$item.eq(_.moveTargetIndex - 1).after($this);
				}

			}
			// 记录本次位置
			_.MEMOmoveTargetIndex = _.moveTargetIndex;
		});
	};


}));

