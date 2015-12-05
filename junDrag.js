// 基于jQuery库开发

// 分析事件:
// 长按按钮达到一定程度 -> 实现拖动 -> 拖动效果...
// 拖动状态时候, 触控点的位置差生新的空白格(先忽略动画效果), li重新排序(动画效果先忽略)
// 放开触控, 判断触控点位置, 移除空白格, 重新排位(先忽略动画效果)

// 具体实现的原理:
// 基于item都是文本流的position:relative布局
// 绑定item对象touchstart事件(事件里绑定touchend事件, 然后绑定touchmove事件)
// 在touchmove事件里, 首先判断: 对比touchstart的时间间断和触控点变化距离, 正则拖拽, 否则暂停事件
// 拖拽效果: 赋值item并添加到队列最后, 使用position:relative,相对定位在本item位置, 优选选择translate方法来拖拽位置

// 改进空间:
// touch事件命名空间
// 限定拖动范围
// 模拟slick插件的做法
// 剥离transition等的方法成为一个组件

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

	var YCdrag = window.YCdrag || {};
	YCdrag = function (container ,options) {
		// 默认选项
		var defalutOptions = {
			// 子容器属性
			ItemNode:"li",
			ItemClassName:"dragItem",
			ItemAttrs:{'data-YC':'drag'},
			// 时间
			timeDuration: 300,
			resetDuration: 600,
			// 动画选项,默认选择translate的CSS效果
			useTransform: true, // <1>
			useCSS: true,
			// 类
			dragClass:"YCdragClone",
			// 允许触控的边缘
			RangeXY: 6,
			// 内容
			dataList:[]
		};

		// 关于动画效果的设置
		var thisSettings = {

			// 对象
			$container: $(container),
			$items: null,
			$dragTarget:null,
			$dragItem: null,
			$el:null,

			// html
			template:[],

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

			// 修改状态
			MoveMode:false,

			// 事件相关的基本属性
			eventStartX: null,
			eventStartY: null,
			moveTargetIndex: null, // moveEvent的位置
			MEMOmoveTargetIndex: null, // 记录moveEvent的位置
			startTargetIndex: null, // startEvent的位置

			// 初始拖拽
			InitializeMoveEvent: false,

			// 定时器
			setTimeFunc: null,

			// CSS属性
			cssTransitions:null, // <1>
			transformsEnabled:null,

			// 时间
			startTime: null,

			// css属性前缀
			transitionType:null,
			transformType:null,
			animType:null
		};

		$.extend(this, thisSettings);

		this.options = $.extend({}, defalutOptions, options);

		this.options.ItemClass = "." + this.options.ItemClassName;

		// 调整css
		this.$container.css('position','relative');

		this.init();
	};

	YCdrag.prototype.init = function() {
		var _ = this;
		setTimeout(function(){// 设置延时执行, 提供可修改YCdrag原型方法,
			_.render();

			// 添加对象jQuery包装集$items
			_.$items = _.$container.find(_.options.ItemClass);

			_.size();

			_.setProps();

			// 执行绑定事件
			_.initailizeEvent();
		},1);
	};

	YCdrag.prototype.templatelist = function(data, i, datas){
		// 本方法提供给用户修改, 但要求必须返回html字符串作为每个item的内容
		return $('<div>')
			.attr({'id': data.id, "data-YClink": data.link})
				.append($("<i class='list-ico'>").addClass(data.icon))
				.append($('<span>').text(data.text))
				[0].outerHTML
	};

	// 思考可不可以直接使用templaterequire灵活
	// 提供几个例子来使用

	YCdrag.prototype.templatefn = function(){
		console.log('templatefn 默认方法');
		var _ = this,
			data = _.options.dataList,
			len = data.length;

		for(var i = 0; i < len; i ++){
			// 产生容器$itemli
			// 获取设定的属性
			var attrs = $.extend({}, this.options.ItemAttrs);
			// ItemAttrs是用来赋值给$el的html属性
			var $itemli = $('<' + this.options.ItemNode + '>').addClass(this.options.ItemClassName).attr(attrs);
			$itemli.html(
				_.templatelist(data[i], i, data)
			);
			_.template.push($itemli[0].outerHTML);
		}
	};

	YCdrag.prototype.render = function(){
		// 先清空html
		this.template = [];
		// 填充template内容并收集所有item的html字符串
		this.templatefn();
		// 把所有item的html渲染到容器里
		this.$container.html(this.template.join(""));
	};

	YCdrag.prototype.getData = function(fnc){
		// 此方法作为数据绑定获取数据, 但可通过DOM操作就完成, 仅作参考
		 var items = this.$container.find(this.options.ItemClass);
		return fnc(items);
	};

	YCdrag.prototype.initailizeEvent = function() {
		// 绑定事件startEvent
		var _ = this;

		_.$items.on(_.startEvent, function(event){

			_.$dragTarget = $(this);

			_.fireEvent("touchStart", [_.$container]);

			_.startTargetIndex = _.$dragTarget.addClass('active').index();

			_.startTime = event.timeStamp || +new Date();

			// 记录初始位置
			_.eventStartX = page('x', event);
			_.eventStartY = page('y', event);
			_.itemStartPagePos = $(this).offset();

			_.setTimeFunc = setTimeout(function(){
				// 以timeDuration为间隔触发press事件
				_.fireEvent("press",[_.$dragTarget])
			}, _.options.timeDuration);

			// 绑定事件stopEvent, 本方法必须在绑定拖拽事件之前
			$('body').one(_.stopEvent, function(){
				_.stopEventFunc();
			});

			// 绑定拖拽事件
			_.drag();
		});
	};

	YCdrag.prototype.stopEventFunc = function(){
		// 停止事件方法stopEventFunc功能: 
		// 1,取消绑定moveEvent事件(但不负责取消stopEvent事件); 
		// 2,清理定时器;
		// 3,判断停止事件后触发的事件: A,有拖动item的话就动画执行item的回归
		// B,没有拖动的话, 思考是什么情况: 
		// YCdrag有三个应用情况: a, stopEvent情况应用; b,moveEvent里的取消拖动的两种情况:太快, 触控变位(闪拉情况)

		var _ = this;

		clearTimeout(_.setTimeFunc);

		$('body').off(_.moveEvent);

		if(_.InitializeMoveEvent){// 已拖拽的mouseUp
			_.dragItemReset();
		}else{ // 没有拖拽后的mouseUp, 判断为click
			_.$container.find(_.options.ItemClass).removeClass('active host');

			if(_.MoveMode === false){// 不能再移动触控的情况触发点击事件!

				var newTime = new Date();

				if(newTime - _.startTime < 250){ // 只有在时间限制内才是click事件

					_.fireEvent("click", [_.$dragTarget]);
				}

			}
		}

		_.InitializeMoveEvent = false;
		_.MoveMode = false;
	};

	YCdrag.prototype.dragItemReset = function(){
		// mouseUp动画
		var _ = this;

		// 获取目标相对于窗口的定位
		var targetPos = _.$dragTarget.offset();

		// 计算出模拟触控点拖item到指定位置的触控点坐标
		var x =  targetPos.left + (_.eventStartX - _.itemStartPagePos.left),
			y = targetPos.top + (_.eventStartY - _.itemStartPagePos.top) ;

		// 添加css的transition属性, 使得有translate的效果
		_.applyTransition(_.$dragItem);
		_.dragCSS({'left':x, 'top':y});

		setTimeout(function(){
			_.$container.find('.' + _.options.dragClass).remove();
			_.$container.find(_.options.ItemClass).removeClass('active host');
			_.disableTransition(_.$dragItem);
			_.fireEvent("afterDrag", [_.$dragTarget]);
		}, _.options.resetDuration);
	};

	YCdrag.prototype.drag = function(){
		var _ = this;

		// 计算每个子项的定位
		// pageXY位置为准, 所以取值offsetXY, 加上li自身尺寸作为范围值,
		// 然后进行moveEvent时候, 检测e.pageXY位置, 然后遍历每个子项的位置, 对比后获取当今位置

		$('body').on(_.moveEvent, function(event){
			// moveEvent的理念是按住后拖动, 非立即拖动

			// 禁止滚动屏幕
			event.stopImmediatePropagation();
			event.stopPropagation();
			event.preventDefault();

			_.MoveMode = true;

			var Move_ex = page('x', event),
				Move_ey = page('y', event);

			// 初始化MoveEvent
			if(!_.InitializeMoveEvent){
				// move过程中对事件的判断有两个重要变量: 延时与范围
				// 都满足: 按住拉动
				// 都不满足: swipe
				// 满足2, 不满足1: 是触控微动, 不停止, 只是忽略
				// 满足1, 不满足2: 是错位, 可以理解是双触点, 按住了一点, 满足时间后立即同时点下第二点
				// YCdrag不考虑??

				// 条件1: 限时内
				var inShort = (event.timeStamp - _.startTime) < _.options.timeDuration;

				// 条件2: 范围外
				// 建议范围RangeXY不要太大, 否则变成了定时拖动.
				var outRang = (Move_ex - _.eventStartX ) > _.options.RangeXY ||
				(Move_ey - _.eventStartY) > _.options.RangeXY;

				console.log('outRang', outRang, 'inShort', inShort);

				if (inShort){
					if(outRang){
						console.log('非拖拽的swipe');
						_.fireEvent("swipe", []);
						_.stopEventFunc();
						return;
					} else {
						// 允许微动, 忽略(return)本次操作, 可继续绑定触发moveEvent
						console.log('允许微动, 忽略(return)本次操作, 可继续绑定触发moveEvent');
						// 思考: 这里不能停止绑定事件, 因为只是微动或震动, 是允许范围
						// 这里应该提供允许click事件的属性
						return;
					}
				}

				if(outRang){
					console.warn('按住达到一定时间后瞬间move超距离, 认为是操作失误');
					_.stopEventFunc();
					return;
				}else{
					// 满足两个条件后, 初始化(仅进行一次)

					// 需要重新获取$items, 不然出现Bug: 多次排序出错
					_.$items = _.$container.find(_.options.ItemClass);

					_.$dragTarget.addClass('host');

					// 获取点击对象的相对父级的位置
					//_.startPos = _.$dragTarget.position();

					// 复制拖拽目标
					_.$dragItem =
						_.$dragTarget.clone()
							.addClass(_.options.dragClass)
							.appendTo(_.$container);// Bug: 改变了$container的高度! 但可通过css固定高度

					// 原item与新添加item的距离
					_.dx = _.$dragTarget.position().left - _.$dragItem.position().left;
					_.dy = _.$dragTarget.position().top - _.$dragItem.position().top;
					
					// fixBug:
					_.$dragItem.css({'position':'relative','left': _.dx,'top': _.dy});

					// 提供触发事件:"beforeDrag"
					_.fireEvent("beforeDrag", [_.$dragItem]);

					_.InitializeMoveEvent = true
				}
			}

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
					_.$items.eq(_.moveTargetIndex).before(_.$dragTarget);
				}else if(_.moveTargetIndex > _.startTargetIndex){
					_.$items.eq(_.moveTargetIndex).after(_.$dragTarget);
				}else if(_.moveTargetIndex == _.startTargetIndex){
					_.$items.eq(_.moveTargetIndex - 1).after(_.$dragTarget);
				}

			}
			// 记录本次位置
			_.MEMOmoveTargetIndex = _.moveTargetIndex;
		});
	};

	/*-----------------------------------------------------------------------------------------------*/
	/*-----------------------------------------------------------------------------------------------*/

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

	// 添加触发事件的方法
	YCdrag.prototype.addEvent = function(event, func){
		if(typeof event === "string"){
			YCdrag.prototype[event] = func;
		}else{
			for(var i = 0 ; i < event.length; i++){
				var ent = event[i];
				YCdrag.prototype[ent] = func;
			}
		}
		return this;
	};

	// 手动触发事件的方法
	YCdrag.prototype.fireEvent = function(eventName, args){
		if(this[eventName]){
			args = [eventName].concat(args);
			this[eventName].apply(this, args);
		}
	};

	YCdrag.prototype.size = function(){
		// 获取子项li尺寸
		this.liH = this.$items.outerHeight(true);
		this.liW = this.$items.outerWidth(true);

		// 获取容器ul尺寸
		this.ulH = this.$container.height();
		this.ulW = this.$container.width();

		// 修复bug的权宜之计
		this.$container.css({'height':this.ulH, 'width':this.ulW, 'overfolow':'hidden'});

		// 计算ul排列了多少列,与项
		this.rows = Math.floor(this.ulH/this.liH); // 最准确的数字
		this.cols;
		// 遍历方法来计算列数
		for(var i = 0; i < this.$items.length; i++){
			if(this.$items.eq(i).position().top > 1){
				this.cols = i;
				break;
			}
		}
		console.log('ul data : rows = ', this.rows, ', cols = ', this.cols);

		// 计算第一个li的页面坐标, 以此作为参考基准
		this.li_1_top = this.$items.eq(0).offset().top;
		this.li_1_left = this.$items.eq(0).offset().left;
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
		_.stopEvent = _.hasTouch ? 'touchend' : 'mouseup';
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
		// position = {left: ?, top: ?} 触控点位置
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
				//console.log(positionProps)
			} else {
				positionProps[_.animType] = 'translate3d(' + x + ', ' + y + ', 0px)';
				_.$dragItem.css(positionProps);
				//console.log(positionProps)
			}
		}
	};

	$.fn.YCdrag = function() {
		var _ = this,
			opt = arguments[0],// 获取传入参数,不用管什么对象了
			args = Array.prototype.slice.call(arguments, 1),
			l = _.length,
			i,
			ret;

		this.YCdrag = new YCdrag(this, opt);
		//for (i = 0; i < l; i++) {
		//	if (typeof opt == 'object' || typeof opt == 'undefined')
		//		_[i].YCdrag = new YCdrag(_[i], opt);
		//	else
		//		ret = _[i].YCdrag[opt].apply(_[i].YCdrag, args);
		//	if (typeof ret != 'undefined') return ret;
		//}
		return this;
	};

}));

