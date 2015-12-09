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

// 已优化的:
// 使用类方法
// 或添加关闭按钮
// 限定拖动范围
// 禁止多点触控(参考slick的swipeHandler里的方法)
// touch事件命名空间

// 改进空间:
// 考虑转屏问题orientationchange, resize??
// 剥离transition等的方法成为一个组件
// 优化绑定事件, 直接绑定在$container就可以
// 拖拽时候, target是没有btn的, 所以需要添加一个class以至于可以隐藏
// 类私有变量使用下划线开头, 区分公开的变量方法
//$.proxy(func, this);


// 项目组版本
// 阉割html的生成方法, 减少开发接口, 只开放结束编辑
// 改名称DraggableMenu, 更改_为this
// 点击跳转怎么处理, 由项目组生产html且绑定绑定事件来跳转

// 升级
// 排序的动画效果

// 思考:
// 点击后才绑定拖拽的事件是否不好?

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

	window.DraggableMenu = function (options) {
		// 默认选项
		var defalutOptions = {
			// 子容器属性
			container:".DraggableMenu",
			activeClass:"activeDraggableMenu",
			draggingClass:"DraggingItem",
			dragClass:"DraggableMenuClone",

			// 或添加关闭按钮:
			closebtnthml:"<span class='DraggableMenuCloseBtn'>-</span>",

			btncss:{
				'position': 'absolute',
				'right': '3px',
				'top': '3px',
				'color': '#ffffff',
				'width': '0.64em',
				'height': '0.64em',
				'line-height': '0.5em',
				'background': 'lightcoral',
				'font-size': '60px',
				'border-radius': ' 100%',
				'cursor': ' pointer',
				'z-index': ' 99',
				'font-weight':'600'
			},
			// 时间
			timeDuration: 300,
			resetDuration: 600,
			// 动画选项,默认选择translate的CSS效果
			useTransform: true, // <1>
			useCSS: true,
			easing: "ease",
			// 允许触控的边缘
			RangeXY: 12,
			// 内容
			dataList:[],
			// 选择模板
			templateRender:true,

			// 公开方法:
			renderer: function(data, i, datas){
			// 本方法提供给用户修改, 但要求必须返回html字符串作为每个item的内容
				return $('<li>').addClass('dragItem').append(
					$('<div>')
						.attr({'id': data.id})
						.append($("<i class='list-ico'>").addClass(data.icon))
						.append($('<span>').text(data.text))
				)[0].outerHTML
			},
			onItemTap:null,
			onDragEnd:null,
			onClose:null
		};

		// 关于动画效果的设置
		var initialSettings = {
			// 对象
			$container: null,
			$items: null,
			$Target:null,
			$dragItem: null,
			$el:null,
			$touchTarget:null,

			// html
			template:[],

			// 尺寸属性
			liW: null,
			liH: null,
			ulW: null,
			ulH: null,
			rows: null,
			cols: null,
			//li_1_top: null,
			//li_1_left: null,

			// 事件类型
			hasTouch: null,
			startEvent: null,
			stopEvent: null,
			moveEvent: null,

			// 修改状态
			dragging:false,
			editing:false, // 编辑模式是针对长按状态里添加"添加或删除"按钮进行编辑, 逻辑是长按进入编辑状态

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
			animType:null,
			// 灵敏模式
			sensitive:true
		};

		$.extend(this, initialSettings);

		this.options = $.extend({}, defalutOptions, options);

		this.$container = $(this.options.container).css('position','relative');

		this.init();

		return this.$container;
	};

	DraggableMenu.prototype.init = function() {

		var DrM = this;

		if(this.options.templateRender && this.options.dataList.length){
			// 模板模式
			this.render();
			this.$items = this.$container.children().each(function(i, item){
				// 给每个子项保存数据
				$(item).data('DraggableMenuData', DrM.options.dataList[i])
			});
		}else{
			this.$items = this.$container.children();
		}

		this.size();

		this.setProps();

		this.initailizeEvent();
	};

	DraggableMenu.prototype.render = function(){
		// 先清空html
		this.template = [];
		// 填充template内容并收集所有item的html字符串
		this.templatefn();
		// 把所有item的html渲染到容器里
		this.$container.html(this.template.join(""));
	};

	DraggableMenu.prototype.templatefn = function(){
		var data = this.options.dataList,
			len = data.length;

		for(var i = 0; i < len; i ++){
			// ItemAttrs是用来赋值给$el的html属性
			var $itemli = this.options.renderer(data[i], i, data);

			this.ItemClassName = $($itemli)[0].className;

			this.template.push($itemli);
		}
	};

	DraggableMenu.prototype.initailizeEvent = function() {

		var DrM = this;

		this.$items.on(DrM.startEvent, function(event){
			// 禁止多点触控
			var fingerCount = event.originalEvent && event.originalEvent.touches !== undefined ?
				event.originalEvent.touches.length : 1;
			if(fingerCount > 1){return;}

			if(event.currentTarget.className.indexOf(DrM.ItemClassName > -1)){
				DrM.$touchTarget =  $(event.currentTarget);
			}else {
				console.log('非点击拖动对象'); return
			}

			//DrM.fireEvent("touchStart", [DrM.$container]);

			DrM.MEMOmoveTargetIndex = DrM.startTargetIndex = DrM.$touchTarget.addClass(DrM.options.activeClass).index();

			DrM.startTime = event.timeStamp || +new Date();

			// 记录初始位置
			DrM.eventStartX = page('x', event);
			DrM.eventStartY = page('y', event);

			DrM.itemStartPagePos = $(this).offset();
			DrM.itemStartPos = $(this).position();

			// 设定时触发press, 因按下后到一定时间, 即使没有执行什么都会执行press和进行编辑模式
			DrM.setTimeFunc = setTimeout(function(){

				DrM.enterEditingMode();

				// 以timeDuration为间隔触发press事件
				//DrM.fireEvent("press",[DrM.$Target]);
			}, DrM.options.timeDuration);

			// 绑定事件stopEvent, 本方法必须在绑定拖拽事件之前
			$('body').one(DrM.stopEvent, function(){
				DrM.stopEventFunc();
			});

			// 绑定拖拽事件
			DrM.drag();
		});
	};

	DraggableMenu.prototype.enterEditingMode = function(){
		var DrM = this;

		if(!this.editing){
			this.editing = true;
		}else{
			if(this.$Target === this.$touchTarget){
				return
			}else{
				this.$Target.find("." + $(this.options.closebtnthml)[0].className).remove();
			}
		}

		this.$Target = this.$touchTarget
			.append(
			$(this.options.closebtnthml).css(this.options.btncss).on(this.startEvent, function(){
				DrM.$Target.remove();
				DrM.options.onClose();
			})
		);
	};

	DraggableMenu.prototype.stopEventFunc = function(){
		// 方法stopEventFunc功能:
		// 1,取消绑定moveEvent事件(但不负责取消stopEvent事件); 
		// 2,清理定时器;
		// 3,判断停止事件后触发的事件: A,有拖动item的话就动画执行item的回归
		// B,没有拖动的话, 思考是什么情况: 
		// DraggableMenu有三个应用情况: a, stopEvent情况应用; b,moveEvent里的取消拖动的两种情况:太快, 触控变位(闪拉情况)
		//$('.DraggableMenutittle3').text(''+ this.dragging);
		clearTimeout(this.setTimeFunc);

		$('body').off(this.moveEvent);

		if(this.InitializeMoveEvent){
			// 已经拖拽了的情况, 执行拖拽项的归位动画
			this.dragItemReset();

		}else{
			this.$container.children().removeClass(this.options.activeClass + " " +this.options.draggingClass);

			if(this.dragging === false){

				var newTime = new Date();

				if(newTime - this.startTime < 250){ // 没有拖拽后且没有滑动且只在限制时间内才是click事件

					//this.fireEvent("click", [this.$Target]);

					if(this.editing){
						// 编辑模式的情况下的点击事件是结束编辑或取消编辑的点击:
						this.$Target.find("." + $(this.options.closebtnthml)[0].className).remove();

						//this.$container.trigger("editEnd", [this.$Target]);

						this.editing = false;
					} else{
						// 非编辑模式的情况下的点击事件是正常点击:
						this.options.onItemTap(this.$touchTarget.data('DraggableMenuData'));
					}
				}

			}
		}

		this.InitializeMoveEvent = false;
		this.dragging = false;
	};

	DraggableMenu.prototype.dragItemReset = function(){
		// 本方法是计算dragItem基于touchStart位置面向的最终滑向位置, 最后执行动画

		var resetX, resetY;
		if (this.transformsEnabled) {
			// 1-1, 基于translate情况:  计算touchStart时dragTarget的坐标和最终滑向位置$dragTarget的坐标之间的差距, 作为translate的xy轴的值
			// 计算最终dragItem滑向位置的坐标:this.$Target.offset();
			var targetPos = this.$Target.offset();
			// 差距 = 最终位置 - touchStart时dragItem的位置
			resetX =  targetPos.left - this.itemStartPagePos.left;
			resetY = targetPos.top - this.itemStartPagePos.top;
		}else{
			// 1-2, 若不适用CSS3的属性transform, 只能使用css坐标通过animate来实现
			// 基于css坐标的话不能像translate那样参考触控位移的距离, 只参考dragItem原本产生时的css坐标和最后的$dragTarget的坐标
			// $dragItem最终的css坐标 = 最终$dragTarget相对父级的位置 - 原本$dragItem相对父级的位置
			resetX =
				this.$container.find("."+ this.options.activeClass).position().left // 需要重新获取元素,不能直接$dragTarget.position(). 因为这样得出的时$dragTarget基于位移之前的坐标, 而不是基于父级的坐标
				- this.dragItemOriginalpos.left;
			resetY = this.$container.find("."+ this.options.activeClass).position().top - this.dragItemOriginalpos.top;
		}

		// 执行滑动效果
		var DrM = this;
		this.animateSlide({'left': resetX, 'top': resetY}, function(){
			DrM.$container.find('.' + DrM.options.dragClass).remove();
			DrM.options.onDragEnd();
			DrM.$container.children().removeClass(DrM.options.activeClass + " " + DrM.options.draggingClass);
			//DrM.fireEvent("afterDrag", [DrM.$Target]);
		});
	};

	DraggableMenu.prototype.drag = function(){
		var DrM = this, dragItemStartX, dragItemStartY;

		$('body').on(this.moveEvent, function(event){
			// DraggableMenu里moveEvent的理念是按住后拖动, 非立即拖动
			DrM.dragging = true;// 进入拖动模式

			var Move_ex = DrM.mvX = page('x', event),
				Move_ey = DrM.mvY=  page('y', event);

			// 初始化MoveEvent
			if(!DrM.InitializeMoveEvent){
				// move过程中对事件的判断有两个重要变量: 延时与范围
				// 都满足: 按住拉动
				// 都不满足: swipe
				// 满足2, 不满足1: 是触控微动, 不停止, 只是忽略
				// 满足1, 不满足2: 是错位, 可以理解是双触点, 按住了一点, 满足时间后立即同时点下第二点
				// 在app实际运行时, 触控滑动监听的moveEvent事件比较灵敏, 即使是快速touchMove, 也计算出触控点位置仅仅移动了1px, 也就是Move_ey - DrM.eventStartY = 1px, 所以这里在未满足时间情况完全不考虑触控点移动而直接停止方法return出来

				// 条件1: 限时内
				var inShort = (event.timeStamp - DrM.startTime) < DrM.options.timeDuration;

				// 条件2: 范围外  ps:建议范围RangeXY不要太大, 否则变成了定时拖动.
				var outRang = (Move_ex - DrM.eventStartX ) > DrM.options.RangeXY ||
				(Move_ey - DrM.eventStartY) > DrM.options.RangeXY;

				if (inShort){
					if(DrM.sensitive){
						// 灵敏模式, 不可能区分触控点变化范围
						DrM.stopEventFunc();
						return;
					}else{
						// 非灵敏模式, 区分触控点变化范围
						if((Move_ex - DrM.eventStartX ) > 1 || (Move_ey - DrM.eventStartY) > 1){
							console.log('非拖拽的swipe');
							//DrM.fireEvent("swipe", []);
							DrM.stopEventFunc();
							return;
						} else {
							// 允许微动, 忽略(return)本次操作, 不停止绑定moveEvent事件, 因为只是微动或震动, 是允许范围
							//console.log('允许微动, 忽略(return)本次操作, 可继续绑定触发moveEvent');
							return;
						}
					}
				}

				if(outRang){
					console.warn('按住达到一定时间后瞬间move超距离, 认为是操作失误');
					DrM.stopEventFunc();
					return false;
				}else{
					// 满足两个条件后, 初始化(仅进行一次)

					// 需要重新获取$items, 否则this.$items仅仅指向旧有的集合, 不是新排序或调整的集合

					DrM.enterEditingMode();

					DrM.$items = DrM.$container.children();

					// 复制目标作为拖拽目标
					DrM.$dragItem =
						DrM.$Target.clone()
							.addClass(DrM.options.dragClass)
							.appendTo(DrM.$container);// Bug: 改变了$container的高度! 但可通过css固定高度

					DrM.dragItemOriginalpos = DrM.$dragItem.position();
					// $dragTarget的坐标
					dragItemStartX = DrM.dragItemStartX = DrM.itemStartPos.left - DrM.$dragItem.position().left;
					dragItemStartY = DrM.dragItemStartY = DrM.itemStartPos.top - DrM.$dragItem.position().top;
					
					// $dragItem的坐标调整等于$dragTarget的坐标
					DrM.$dragItem.css({'position':'relative','left': dragItemStartX,'top': dragItemStartY});

					//DrM.fireEvent("beforeDrag", [DrM.$dragItem]);

					DrM.InitializeMoveEvent = true;

					DrM.$Target.addClass(DrM.options.draggingClass);
				}
			} else {
				// 在初始化拖动后才可禁止默认事件行为
				event.stopImmediatePropagation();
				event.stopPropagation();
				event.preventDefault();

				// 计算
				var cssX, cssY;
				// 触控点移动距离
				cssX = Move_ex - DrM.eventStartX;
				cssY = Move_ey - DrM.eventStartY;
				// 若不适用CSS3的属性transform, 只能使用css坐标来拖拽
				if (DrM.transformsEnabled === false) {
					//$dragItem拖拽时的位置 = 它的坐标 + 拖拽距离
					cssX = dragItemStartX + cssX;
					cssY = dragItemStartY + cssY;
				}

				// 拖拽
				DrM.setCSS({'left': cssX, 'top': cssY});
				//DrM.$dragItem.css({'left':Move_ex - eX, 'top':Move_ey - eY});// 测试用, 没有优化动画的模式

				// 重新排序
				DrM.reorder(cssX, cssY);
			}
		});
	};

	DraggableMenu.prototype.reorder = function(cssX, cssY) {
		/* 思路1 : 监听触控点位置来插入空白格子 */
		// 1, 计算触控点位置
		// 2, 计算target的文档位置
		// 3, 以1与2的相对位置, 整除liW和liH得出触控点所在的li的序号index, 以此作为插入的位置
		// 但Bug!!! 缩放屏幕会出现偏差. 根本原因是步骤1与2的获取位置的原理不同, 缩放时各自变化比例不同, 所以不能同时使用思路1

		/* 思路2 : 监听拖动项的中心位置来插入空白格子 */
		// 1, 计算target中心的初始位置targetCenterStart
		var targetCenterStartX = this.itemStartPos.left + this.liW/2;
		var targetCenterStartY = this.itemStartPos.top + this.liH/2;
		// 2, 计算拖拽时target中心位置的坐标targetCenterPos
		var targetCenterPosX = targetCenterStartX + cssX;
		var targetCenterPosY = targetCenterStartY + cssY;
		// 当坐标超出方位时的修正
		targetCenterPosX = targetCenterPosX > 0 ? (targetCenterPosX < this.ulW ? targetCenterPosX: this.ulW) : 0;
		targetCenterPosY = targetCenterPosY > 0 ? (targetCenterPosY < this.ulH ? targetCenterPosY: this.ulH) : 0;
		// 3, 以targetCenterPos坐标来计算触控点所在的li的序号位置moveTargetIndex
		var curCol = Math.floor(targetCenterPosX/this.liW) + 1;
		var curRow = Math.floor(targetCenterPosY/this.liH);
		this.moveTargetIndex = curRow * this.cols + curCol - 1;

		if(this.MEMOmoveTargetIndex == this.moveTargetIndex){
			// 位移未超出一个li位置, 就取消执行
			return false;
		}else{
			// 4, 以moveTargetIndex作为插入的位置
			if(this.moveTargetIndex < this.startTargetIndex){
				this.$items.eq(this.moveTargetIndex).before(this.$Target);
			} else if (this.moveTargetIndex > this.startTargetIndex){
				this.$items.eq(this.moveTargetIndex).after(this.$Target);
			} else if (this.moveTargetIndex == this.startTargetIndex && this.startTargetIndex == 0){
				this.$items.eq(1).before(this.$Target);
			} else {
				this.$items.eq(this.moveTargetIndex - 1).after(this.$Target);
			}
			// 记录本次位置
			this.MEMOmoveTargetIndex = this.moveTargetIndex;
		} // 对比思路1, 由于位移的cssX与cssY是稳定的, 判断插入的位置只是基于文档位置的获取机制, 所以可以.
	};

	/*-----------------------------------------------------------------------------------------------*/
	/*-----------------------------------------------------------------------------------------------*/
	/*-----------------------------------------------------------------------------------------------*/
	/*-----------------------------------------------------------------------------------------------*/
	/*-----------------------------------------------------------------------------------------------*/

	DraggableMenu.prototype.applyTransition = function() {
		// 添加css  Transition
		var transition = {};

		transition[this.transitionType] = this.transformType + ' ' + this.options.resetDuration + 'ms ' + this.options.easing;

		this.$dragItem.css(transition);
	};

	DraggableMenu.prototype.disableTransition = function() {
		// 去掉css  Transition
		var transition = {};

		transition[this.transitionType] = '';

		this.$dragItem.css(transition);
	};

	// 添加触发事件的方法
	DraggableMenu.prototype.addEvent = function(event, func){
		if(typeof event === "string"){
			DraggableMenu.prototype[event] = func;
		}else{
			for(var i = 0 ; i < event.length; i++){
				var ent = event[i];
				DraggableMenu.prototype[ent] = func;
			}
		}
		return this;
	};

	// 手动触发事件的方法
	DraggableMenu.prototype.fireEvent = function(eventName, args){
		if(this[eventName]){
			args = [eventName].concat(args);
			this[eventName].apply(this, args);
		}
	};

	DraggableMenu.prototype.size = function(){
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
		//this.cols;
		// 遍历方法来计算列数
		for(var i = 0; i < this.$items.length; i++){
			if(this.$items.eq(i).position().top > 1){
				this.cols = i;
				break;
			}
		}
		//console.log('ul data : rows = ', this.rows, ', cols = ', this.cols);

		//// 计算第一个li的页面坐标, 以此作为参考基准
		//this.li_1_top = this.$items.eq(0).offset().top;
		//this.li_1_left = this.$items.eq(0).offset().left;
	};

	DraggableMenu.prototype.setProps = function() {
		// 1, 选择事件类型
		// 2, 检测判断:
		// cssTransitions
		// 3, 设置前缀:
		// animType/ transformType/ transitionType
		// 4, 检测判断:
		// transformsEnabled = 根据useTransform正反基础, 检测animType不为null与false

		var bodyStyle = document.body.style;

		// 选择事件类型, 添加命名空间, 不会与其他插件冲突
		this.hasTouch = hasTouch ;
		this.startEvent = this.hasTouch ? 'touchstart.DraggableMenu' : 'mousedown.DraggableMenu';
		this.stopEvent = this.hasTouch ? 'touchend.DraggableMenu' : 'mouseup.DraggableMenu';
		this.moveEvent = this.hasTouch ? 'touchmove.DraggableMenu' : 'mousemove.DraggableMenu';

		if (bodyStyle.WebkitTransition !== undefined ||
			bodyStyle.MozTransition !== undefined ||
			bodyStyle.msTransition !== undefined) {
			if (this.options.useCSS === true) { //options是提供用户的选择, 但要使用的话, 需检测环境能否
				this.cssTransitions = true;
			}
		}
		/*setProps的主要作用之一:检测可使用的前缀, 可以用来借鉴, Perspective更小众*/
		if (bodyStyle.OTransform !== undefined) {
			this.animType = 'OTransform';
			this.transformType = '-o-transform';
			this.transitionType = 'OTransition';
			if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) this.animType = false;
		}
		if (bodyStyle.MozTransform !== undefined) {
			this.animType = 'MozTransform';
			this.transformType = '-moz-transform';
			this.transitionType = 'MozTransition';
			if (bodyStyle.perspectiveProperty === undefined && bodyStyle.MozPerspective === undefined) this.animType = false;
		}
		if (bodyStyle.webkitTransform !== undefined) {
			this.animType = 'webkitTransform';
			this.transformType = '-webkit-transform';
			this.transitionType = 'webkitTransition';
			if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) this.animType = false;
		}
		if (bodyStyle.msTransform !== undefined) {
			this.animType = 'msTransform';
			this.transformType = '-ms-transform';
			this.transitionType = 'msTransition';
			if (bodyStyle.msTransform === undefined) this.animType = false;
		}
		if (bodyStyle.transform !== undefined && this.animType !== false) {
			this.animType = 'transform';
			this.transformType = 'transform';
			this.transitionType = 'transition';
		}
		this.transformsEnabled = this.options.useTransform && (this.animType !== null && this.animType !== false);
		//this.transformsEnabled = false;// 测试用
		//this.cssTransitions = false;// 测试用
	};

	DraggableMenu.prototype.setCSS = function(position) {
		// 方法setCSS: 即时位置调整
		var positionProps = {},
			$obj = this.$dragItem,
			x, y;

		x =  Math.ceil(position.left) + 'px';
		y =  Math.ceil(position.top) + 'px';

		if (this.transformsEnabled === false) {
			$obj.css({'left': x, "top": y});
		} else {
			positionProps = {};
			if (this.cssTransitions === false) {
				positionProps[this.animType] = 'translate(' + x + ', ' + y + ')';
				$obj.css(positionProps);
				//console.log(positionProps)
			} else {
				positionProps[this.animType] = 'translate3d(' + x + ', ' + y + ', 0px)';
				$obj.css(positionProps);
				//console.log(positionProps)
			}
		}
	};

	DraggableMenu.prototype.animateSlide = function(position, callback) {
		// 方法animateSlide: 位置调整的动画滑动效果, 且接收callback
		var animProps = {}, DrM = this,
			$obj = this.$dragItem;

		if (this.transformsEnabled === false) {
			// 降级方案 使用animate方案
			$obj.animate(position, this.options.resetDuration, this.options.easing, callback);
		} else {

			if (this.cssTransitions === false) {
				// 使用translate的CSS方法, 需要获取到$dragItem的translate位置
				// 获取本对象$dragItem的css属性translate的值:
				var objOriginal = this.$dragItem[0].style.transform,
					objOriginalX = Number(objOriginal.substring(10, objOriginal.indexOf("px"))),
					objOriginalY = Number(objOriginal.substring(objOriginal.lastIndexOf(",") + 1, objOriginal.lastIndexOf("px")));

				var startPosition = {"left":objOriginalX, "top":objOriginalY},
					curPosition = {"left":objOriginalX, "top":objOriginalY},
					pr = {};

				$(startPosition)// 这个位置是拖拽的最后的位置, 也就是moveEvent的位置
					.animate(position, {
						duration: this.options.resetDuration,
						//easing: this.options.easing,
						step: function(now, data) {
							pr[data.prop] = now;
							$.extend(curPosition, pr);
								animProps[DrM.animType] = 'translate(' +
									curPosition.left + 'px, ' + curPosition.top + 'px)';
								$obj.css(animProps);
						},
						complete: function() {
							if (callback) {
								callback.call();
							}
						}
					});

			} else {
				// 使用translate3D的CSS方法
				this.applyTransition();

				animProps[this.animType] = 'translate3d(' + position.left + 'px, ' + position.top + 'px, 0px)';

				$obj.css(animProps);


				if (callback) {
					setTimeout(function() {

						DrM.disableTransition();

						callback.call();
					}, DrM.options.resetDuration);
				}
			}

		}

	};


	DraggableMenu.prototype.getData = function(fnc){
		// 此方法作为数据绑定获取数据, 但可通过DOM操作就完成, 仅作参考
		var items = this.$container.children();
		return fnc(items);
	};

	//$.fn.DraggableMenu = function() {
	//	var opt = arguments[0],// 获取传入参数,不用管什么对象了
	//		args = Array.prototype.slice.call(arguments, 1),
	//		l = this.length,
	//		i,
	//		ret;
	//
	//	this.DraggableMenu = new DraggableMenu(this, opt);
	//	for (i = 0; i < l; i++) {
	//		if (typeof opt == 'object' || typeof opt == 'undefined')
	//			this[i].DraggableMenu = new DraggableMenu(this[i], opt);
	//		else
	//			ret = this[i].DraggableMenu[opt].apply(this[i].DraggableMenu, args);
	//		if (typeof ret != 'undefined') return ret;
	//	}
	//	return this;
	//};

}));

