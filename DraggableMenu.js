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
// 拖拽时候, target是没有btn的, 所以需要添加一个class以至于可以隐藏
// 类私有变量和方法都使用下划线开头, 区分公开的变量方法
// $.proxy(func, this);

// 改进空间:
// 考虑转屏问题orientationchange, resize??
// 剥离transition等的方法成为一个组件

// 项目组版本
// 阉割html的生成方法, 减少开发接口, 只开放结束编辑
// 点击跳转怎么处理, 由项目组生产html且绑定绑定事件来跳转

// 升级
// 排序的动画效果
// 点击的放大效果

// 说明
// displaynone

// 隐藏_hardConfig, 不能开放

/**
 * @class DraggableMenu
 *
 */


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

	var DraggableMenu = function (options) {

		this.initialize(options);

		return this;
	};

	DraggableMenu.prototype = {
		initialize: function(options) {

			// 绑定方法的上下文
			this._startEventFunc = $.proxy(this._startEventFunc, this);
			this._dragEventFn = $.proxy(this._dragEventFn, this);
			this._stopEventFunc = $.proxy(this._stopEventFunc, this);

			this._hasTouch = 'ontouchstart' in window;

			this._config = $.extend({}, this._defaultConfig, options);

			this._closeBtnClass = "." + $(this._config.closeBtnHtml)[0].className;

			this._$container = $(this._config.container).css('position','relative');

			if(this._hardConfig._templateRender && this._config.dataList.length){
				this._render();
			}

			this._size();

			this._setProps();

			// 绝对定位
			// 在size方法里已经获取的itemWH与containerWH可以作为每个item的绝对定位的位置了, 不用遍历items来记录

			// 初步:
			// 1, 建立一个数组ary用来记录[]
			// 2, 我想有文本流的自动排队的效果, 所以插入的事件发生在ary里, setItemsPos方法是可以选择性的进行排序,
			// 3, 每个dom的dataID, 所以可以每次都获取ID值来排序?
			// 现在, 绝对定位,
			// 不变的是初始化的排序数组initializeAry, 数组保存的是每个DOM的jQuery对象, 每次使用这个来遍历
			// 建立数组reorderAry, 每次排序后的DOM排序情况, 这样可以在
			// 不变的是格子位置的数组posAry

			if(this._hardConfig._reorderCSS){
				// 每个都绝对定位在(0, 0)css坐标
				this._$items.css('position', 'absolute');
				// 获取初始排序的数组
				this._freshItemsInitAry();
				// 根据容器的尺寸计算出一个数组, 长度为items.length, 内容是格子左上角坐标
				this._calcPosAry();
				// 使用translate来填坑
				this._setItemsPos(this._reorderItemsAry);
			}
			// 注意的是获取DOM的排序需要本源代码里提供方法, 因为不可能直接在DOM处理

			this._$items.on(this._startEvent, this._startEventFunc);
		},

		/*
		* 默认设置
		* */
		_defaultConfig: {
			// 容器对象
			container:".DraggableMenu",
			// class名称
			// 激活的item, 包括拖动的item和排序的item
			activeItemClass:"DrM-activeItem",
			// 排序的item
			reorderItemClass:"DrM-reorderItem",
			// 拖动的item
			draggingItemClass:"DrM-DraggingItem",

			// 关闭按钮html:
			closeBtnHtml:"<span class='DrM-CloseBtn'>-</span>",
			// 关闭按钮css
			closeBtnCss:{
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

			// 长按的时间间隔
			pressDuration: 300,
			// 动画的时间长度
			cssDuration: 400,
			// 允许触控的边缘值, 单位px
			RangeXY: 12,

			// 渲染html的数据内容
			dataList:[],

			// 渲染html的方法
			renderer: function(data, i, datas){
				// 本方法提供给用户修改, 但要求必须返回html字符串作为每个item的内容
				return $('<li>').addClass('dragItem').append(
					$('<div>')
						.attr({'id': data.id})
						.append($("<i class='list-ico'>").addClass(data.icon))
						.append($('<span>').text(data.text))
				);
			},

			// 公开事件: 正常点击事件
			onItemTap:null,
			// 公开事件: 拖放后的事件
			onDragEnd:null,
			// 公开事件: 删除item的事件
			onClose:null,
			// 公开事件: 进入编辑模式的事件
			onEditing:null
		},

		/**
		 * 容器对象
		 */
		_$container: null,
		/**
		 * items集合
		 */
		_$items: null,
		/**
		 * 排序对象
		 */
		_$reorderItem:null,
		/**
		 * 拖拽对象
		 */
		_$draggingItem: null,
		/**
		 * 点击对象
		 */
		_$touchTarget:null,

		/**
		 * item尺寸
		 */
		_itemW: null,
		_itemH: null,

		/**
		 * 容器尺寸
		 */
		_containerW: null,
		_containerH: null,

		/**
		 * 容器列数
		 */
		_containerCols: null,

		/**
		 * 事件类型
		 */
		_hasTouch: null,
		_startEvent: null,
		_stopEvent: null,
		_moveEvent: null,

		/*
		* 删除了的数组index值, 基于初始化的index
		* */
		_deleteIndex:[],

		/**
		 * 状态: _dragging是进入touchMove的状态
		 */
		_dragging:false,
		/**
		 * 状态: editing编辑模式是针对长按状态里添加"添加或删除"按钮进行编辑, 逻辑是长按进入编辑状态
		 */
		_editing:false,

		/*
		* touchStart的坐标
		* */
		_eventStartX: null,
		_eventStartY: null,

		/*
		 * reorderItem现在的位置序号
		 * */
		_reorderItemIndex: null,

		/*
		 * reorderItem初始的位置序号
		 * */
		_touchItemIndex: null,

		/*
		 * touchStart时间
		 * */
		_startTime: null,

		/*
		* 拖拽的初始化状态
		* */
		_InitializeMoveEvent: false,

		/*
		* 定时器
		* */
		_setTimeFunc: null,

		/*
		* 环境是否支持Transitions
		* */
		_cssTransitions:null,
		/*
		 * 环境是否支持transforms
		 * */
		_transformsEnabled:null,

		/*
		* css属性transition/transform/translate前缀
		* */
		_transitionType: null,
		_transformType: null,
		_animType: null,

		/*
		* 不可拖动与可拖动的数量
		* */
		_undraggableCount: 0,
		_draggableCount: 0,

		/*
		* 固定设置, jun的开发配置
		* */
		_hardConfig :{
			_reorderCSS:true,
			// 灵敏模式
			_sensitive: true,
			// 选择transform动画
			_useTransform: true,
			// 选择模板
			_templateRender:true,
			// 选择transition动画, 也就是选择translate3D
			_useCSS: true,
			// 选择transition的动画效果属性
			_transitionTiming: "ease",
			// 点击时间间隔
			_clickDuration:250
		},

		_render: function(){
			// 填充template内容并收集所有item的html的jQuery包装集
			var data = this._config.dataList,
				len = data.length,
				$itemHtml, $itemsHtml = [];

			for(var i = 0; i < len; i++){
				$itemHtml = this._config.renderer(data[i], i, data)// 根据用户的自定义模板填进数据
					.data('DraggableMenuData', data[i]);// 对模板包装jQuery对象并添加数据
				$itemsHtml.push($itemHtml);// ps: 假设undraggable项写在数组的最后
				if(data[i].undraggable){// 记数
					this._undraggableCount++;
				}
			}
			// 把所有item的html的jQuery包装集渲染到容器里
			this._$container.html($itemsHtml);
		},

		_size: function(){
			this._$items = this._$container.children();

			// 获取子项li尺寸
			this._itemH = this._$items.outerHeight(true);
			this._itemW = this._$items.outerWidth(true);

			// 获取容器ul尺寸
			this._containerH = this._$container.height();
			this._containerW = this._$container.width();

			// 修复bug的权宜之计
			this._$container.css({'height':this._containerH, 'width':this._containerW, 'overfolow':'hidden'});

			// 遍历方法来计算容器列数, 方法是计算第i个换行的,那i就是列数
			for(var i = 0; i < this._$items.length; i++){
				// 只需要遍历到第二行就知道列数量了, 但判断的1px值有待优化
				if(this._$items.eq(i).position().top > 1){
					this._containerCols = i;
					break;
				}
			}
		},


		// 获取初始排序的数组并每个都绝对定位在(0, 0)css坐标
		_freshItemsInitAry: function(){
			// 每次初始化与删除/添加item后, 都执行_freshItemsInitAry方法

			// 获取当前的所有items
			this._reorderItemsAry = this._$container.children();

			// 创建数组_indexAry,以item文本流序号为内容的数组
			this._indexAry = [];
			for(var i = 0; i < this._reorderItemsAry.length; i++){
				this._indexAry.push(
					i // i是文本流的序号
				);
			}
			//console.log('this._indexAry', this._indexAry);
		},
		// 根据容器的尺寸计算出一个数组, 长度为items.length, 内容是格子左上角坐标
		_calcPosAry: function(){
			// 位置的静态写法
			// 数组保存:格子数量和各格子坐标, 优点: 避免重复计算
			var len = this._reorderItemsAry.length;
			this._posAry = [];
			 // 默认基于translate3D的修改模式, 所以升级必须优化
			for(var i = 0; i < len; i++){
				var position = {};
				var inRow = Math.floor(i / this._containerCols);
				var inCol = i % this._containerCols;
				position.left = inCol * this._itemW;
				position.top = inRow * this._itemH;
				this._posAry.push(position);
			}
			//console.log('this._posAry', this._posAry)
		},

		// 模拟步骤:
		// 创建变量: 1,初始initItemsAry 2,复制initItemsAry后得出reorderItemsAry作为排序数组 3, 计算posAry作为位置对应值
		// 以reorderItemsAry作为排序数组, 取值posAry, 进行_setItemsPos
		// 拖动改变后, reorderItemsAry更新
		// 以reorderItemsAry作为排序数组, 取值posAry, 进行_setItemsPos
		// 点击后是获取到initItemsAry的index值, 那么可以在reorderItemsAry对应itemInitIndex值来获取到对象的itemReorderIndex值
		// 通过itemReorderIndex值就可以使用_calcPos来计算出坐标(其实是避免了获取translate的数值, 因为兼容很难!)

		// 有无都需要建立一个reorderItemsAry, 它是复制initItemsAry, 用来处理排序

		//_calcPos: function(i){
		//	// 位置的动态写法
		//	var position = {};
		//	var inRow = Math.floor(i / this._containerCols);
		//	var inCol = i % this._containerCols;
		//	position.left = inCol * this._itemW;
		//	position.top = inRow * this._itemH;
		//	return position;
		//},

		// 使用translate来填坑
		_setItemsPos: function(items){
			// 升级: 选择性执行_setPosition
			console.log('items', items);
			this._applyTransition(items);// 选择性执行
			for(var i = 0; i < items.length; i++){
				//console.log(this._posAry[i]);
				this._setPosition($(items[i]), this._posAry[i])
			}
		},
		_reorderFn: function(targetAry, reorderItemIndex, newIndex){
			//if(reorderItemIndex == reorderItemIndex){ return }

			// 抽出数组_reorderItemsAry中reorderItem的index
			var reorderItem = targetAry.splice(reorderItemIndex, 1)[0];

			// 把reorderItem插入数组_reorderItemsAry中newIndex位置
			targetAry.splice(newIndex, 0, reorderItem);
		},

		/* 初始化完毕*/

		_startEventFunc :function(event){
			// 禁止多点触控
			var fingerCount = event.originalEvent && event.originalEvent.touches !== undefined ?
				event.originalEvent.touches.length: 1;
			if(fingerCount > 1){return;}

			this._$touchTarget = $(event.currentTarget);

			this._$touchTargetData = this._$touchTarget.data('DraggableMenuData');

			//if(event.currentTarget.className.indexOf(this.ItemClassName > -1)){
			//	this._$touchTarget =  $(event.currentTarget);
			//}else {
			//	console.log('非点击拖动对象'); return
			//}
			//this.fireEvent("touchStart", [this._$container]);

			this._startTime = event.timeStamp || +new Date();

			// 记录初始位置
			this._eventStartX = this._page('x', event);
			this._eventStartY = this._page('y', event);

			this._itemStartPagePos = this._$touchTarget.offset();
			this.itemStartPos = this._$touchTarget.position();

			// 计算target中心的初始位置targetCenterStart
			this.targetCenterStartX = this.itemStartPos.left + this._itemW/2;
			this.targetCenterStartY = this.itemStartPos.top + this._itemH/2;

			if(this._hardConfig._reorderCSS){
				this._touchItemIndex = this._$touchTarget.addClass(this._config.activeItemClass).index();
				//console.log('现在items里的index = ', this._touchItemIndex, '以删除的有', this._deleteIndex);

				// 需要一直获取初始化的时候的index值, 不是现在items里的index值
				// 把现在文本流的index值调整为初始化的index值
				//var MEMO_touchItemIndex = this._touchItemIndex;
				for(var u = 0; u < this._deleteIndex.length; u++){
					var prop = this._deleteIndex[u];
					//console.log(prop , this._touchItemIndex);
					if(prop <= this._touchItemIndex){
						this._touchItemIndex++;
						//console.log(this._touchItemIndex -1 , this._touchItemIndex)
					}
				}
				// 根据初始化的index值获取现在格子的index值
				this._touchItemIndex = $.inArray(this._touchItemIndex, this._indexAry);
				// 命名_touchItemIndex是不正确表达意思的, 应该是positionIndex
			}else{
				this._touchItemIndex = this._$touchTarget.addClass(this._config.activeItemClass).index();
			}
			//console.log('this._touchItemIndex', this._touchItemIndex);

			// 绑定事件_stopEvent, 本方法必须在绑定拖拽事件之前
			$('body').one(this._stopEvent, this._stopEventFunc);

			if(!this._$touchTargetData.undraggable){
				// 设定时触发press, 因按下后到一定时间, 即使没有执行什么都会执行press和进行编辑模式
				this._setTimeFunc = setTimeout($.proxy(function(){

					this._enterEditingMode();

					// 以pressDuration为间隔触发press事件
					//this.fireEvent("press",[this._$reorderItem]);
				}, this), this._config.pressDuration);

				// 绑定拖拽事件
				$('body').on(this._moveEvent, this._dragEventFn);
			}

		},

		_enterEditingMode: function(){
			var DrM = this;

			if(!this._editing){
				this._editing = true;
			}else{
				if(this._$reorderItem === this._$touchTarget){
					return
				}else{
					this._$reorderItem.find(this._closeBtnClass).remove();
				}
			}

			this._config.onEditing();

			this._$reorderItem = this._$touchTarget
				.append(
				$(this._config.closeBtnHtml).css(this._config.closeBtnCss).on(this._startEvent, function(){
					DrM._$reorderItem.remove();
					DrM._config.onClose();
					DrM._setItemsPos(DrM._$container.children());

					// 删除item后, 刷新排序数组, 等于重新开始排序情况(我之前以视角角度来审视排序, 混乱了删除后的情况)
					DrM._freshItemsInitAry();

					// 需要删除的排序
					// 更新数组
					// 获取现在的items进行排序

					//console.log(DrM._touchItemIndex);
					//console.log('删除的序号',DrM._indexAry[DrM._touchItemIndex]);
					// 删除现在的item

					//DrM._deleteIndex.push(DrM._indexAry[DrM._touchItemIndex]);
					//DrM._deleteIndex.sort();
					//
					//console.log('DrM._indexAry[DrM._touchItemIndex]', DrM._indexAry[DrM._touchItemIndex]);
					//// 删除_reorderItemsAry里的对应的
					//DrM._reorderItemsAry.splice(DrM._indexAry[DrM._touchItemIndex],1);
					//console.log(DrM._indexAry[DrM._touchItemIndex],'jQuery包装集里的',DrM._reorderItemsAry);
					//
					//DrM._setItemsPos(DrM._reorderItemsAry);
					//
					//// 在排序的数组_indexAry里删除这个index值
					//DrM._indexAry.splice(DrM._touchItemIndex,1);
					//console.log('删除后的数组', DrM._indexAry, '累计删除 = ', DrM._deleteIndex);

				})
			);
		},


		_stopEventFunc: function(){
			// 方法stopEventFunc功能:
			// 1,取消绑定moveEvent事件(但不负责取消_stopEvent事件);
			// 2,清理定时器;
			// 3,判断停止事件后触发的事件: A,有拖动item的话就动画执行item的回归
			// B,没有拖动的话, 思考是什么情况:
			// DraggableMenu有三个应用情况: a, _stopEvent情况应用; b,moveEvent里的取消拖动的两种情况:太快, 触控变位(闪拉情况)
			//$('.DraggableMenutittle3').text(''+ this._dragging);
			clearTimeout(this._setTimeFunc);

			$('body').off(this._moveEvent);

			if(this._InitializeMoveEvent){
				// 已经拖拽了的情况, 执行拖拽项的归位动画
				this._dragItemReset();

			}else{
				this._$container.children().removeClass(this._config.activeItemClass + " " + this._config.reorderItemClass);

				if(this._dragging === false){

					var newTime = new Date();

					if(newTime - this._startTime < this._hardConfig._clickDuration){ // 没有拖拽后且没有滑动且只在限制时间内才是click事件

						//this.fireEvent("click", [this._$reorderItem]);

						if(this._editing){
							// 编辑模式的情况下的点击事件是结束编辑或取消编辑的点击:
							this._$reorderItem.find(this._closeBtnClass).remove();

							//this._$container.trigger("editEnd", [this._$reorderItem]);

							this._editing = false;
						} else{
							// 非编辑模式的情况下的点击事件是正常点击:
							this._config.onItemTap(this._$touchTargetData);
						}
					}

				}
			}

			this._InitializeMoveEvent = false;
			this._dragging = false;
		},

		_dragItemReset: function(){
			// 本方法是计算dragItem基于touchStart位置面向的最终滑向位置, 最后执行动画

			var resetX, resetY;

			if(this._hardConfig._reorderCSS){
				resetX = this._posAry[this._reorderItemIndex].left;
				resetY = this._posAry[this._reorderItemIndex].top;
			} else {
				if (this._transformsEnabled) {
					// 1-1, 基于translate情况:  计算touchStart时dragTarget的坐标和最终滑向位置$dragTarget的坐标之间的差距, 作为translate的xy轴的值
					// 计算最终dragItem滑向位置的坐标:this._$reorderItem.offset();
					var targetPos = this._$reorderItem.offset();
					// 差距 = 最终位置 - touchStart时dragItem的位置
					resetX =  targetPos.left - this._itemStartPagePos.left;
					resetY = targetPos.top - this._itemStartPagePos.top;
				}else{
					// 1-2, 若不适用CSS3的属性transform, 只能使用css坐标通过animate来实现
					// 基于css坐标的话不能像translate那样参考触控位移的距离, 只参考dragItem原本产生时的css坐标和最后的$dragTarget的坐标
					// _$draggingItem最终的css坐标 = 最终$dragTarget相对父级的位置 - 原本_$draggingItem相对父级的位置
					resetX =
						this._$container.find("."+ this._config.activeItemClass).position().left // 需要重新获取元素,不能直接$dragTarget.position(). 因为这样得出的时$dragTarget基于位移之前的坐标, 而不是基于父级的坐标
						- this.dragItemOriginalpos.left;
					resetY = this._$container.find("."+ this._config.activeItemClass).position().top - this.dragItemOriginalpos.top;
				}
			}

			// 执行滑动效果
			var DrM = this;
			this._animateSlide(this._$draggingItem, {'left': resetX, 'top': resetY}, function(){
				DrM._$container.find('.' + DrM._config.draggingItemClass).remove();
				DrM._config.onDragEnd();
				DrM._$container.children().removeClass(DrM._config.activeItemClass + " " + DrM._config.reorderItemClass);
				//DrM.fireEvent("afterDrag", [DrM._$reorderItem]);
			});
		},

		_dragEventFn: function(event){
			var dragItemStartX, dragItemStartY;

			// DraggableMenu里_moveEvent的理念是按住后拖动, 非立即拖动
			this._dragging = true;// 进入拖动模式

			var Move_ex = this._page('x', event),
				Move_ey = this._page('y', event);

			// 初始化MoveEvent
			if(!this._InitializeMoveEvent){
				// move过程中对事件的判断有两个重要变量: 延时与范围
				// 都满足: 按住拉动
				// 都不满足: swipe
				// 满足2, 不满足1: 是触控微动, 不停止, 只是忽略
				// 满足1, 不满足2: 是错位, 可以理解是双触点, 按住了一点, 满足时间后立即同时点下第二点
				// 在app实际运行时, 触控滑动监听的_moveEvent事件比较灵敏, 即使是快速touchMove, 也计算出触控点位置仅仅移动了1px, 也就是Move_ey - this._eventStartY = 1px, 所以这里在未满足时间情况完全不考虑触控点移动而直接停止方法return出来

				// 条件1: 限时内
				var inShort = (event.timeStamp - this._startTime) < this._config.pressDuration;

				if (inShort){
					if(this._hardConfig._sensitive){
						// 灵敏模式, 不可能区分触控点变化范围
						this._stopEventFunc();
						return;
					}else{
						// 非灵敏模式, 区分触控点变化范围
						if((Move_ex - this._eventStartX ) > 1 || (Move_ey - this._eventStartY) > 1){
							console.log('非拖拽的swipe');
							//this.fireEvent("swipe", []);
							this._stopEventFunc();
							return;
						} else {
							// 允许微动, 忽略(return)本次操作, 不停止绑定_moveEvent事件, 因为只是微动或震动, 是允许范围
							//console.log('允许微动, 忽略(return)本次操作, 可继续绑定触发_moveEvent');
							return;
						}
					}
				}

				// 条件2: 范围外  ps:建议范围RangeXY不要太大, 否则变成了定时拖动.
				var RangeXY = this._config.RangeXY;

				if(this._hardConfig._sensitive){
					RangeXY = RangeXY * 3;
				}

				var outRang = (Move_ex - this._eventStartX ) > RangeXY ||
					(Move_ey - this._eventStartY) > RangeXY;

				if(outRang){
					console.warn('按住达到一定时间后瞬间move超距离, 认为是操作失误');
					this._stopEventFunc();
					return false;
				}else{
					// 满足两个条件后, 初始化(仅进行一次)

					this._enterEditingMode();

					// 需要重新获取_$items, 否则this._$items仅仅指向旧有的集合, 不是新排序或调整的集合
					this._$items = this._$container.children();

					// 重新获取可以拖拉的数量
					this._draggableCount = this._$items.length - this._undraggableCount;

					// 复制目标作为拖拽目标
					this._$draggingItem =
						this._$reorderItem.clone()
							.addClass(this._config.draggingItemClass)
							.css({'z-index':'99'})
							.appendTo(this._$container);// Bug: 改变了_$container的高度! 但可通过css固定高度

					this.dragItemOriginalpos = this._$draggingItem.position();

					// _$draggingItem的坐标调整等于$dragTarget的坐标
					if(this._hardConfig._reorderCSS){
						// $dragTarget的坐标 = reorderItem的坐标
						this._draggingItemStartPos = this._posAry[this._touchItemIndex];
						this._setPosition(
							this._$draggingItem.css({'positions':'absolute'}),
							this._draggingItemStartPos
						);
						this._reorderItemIndex = this._touchItemIndex;
					}else{
						// $dragTarget的坐标 = 相对于reorderItem坐标与自身文本流坐标的差距
						dragItemStartX = this.itemStartPos.left - this._$draggingItem.position().left;
						dragItemStartY = this.itemStartPos.top - this._$draggingItem.position().top;
						this._$draggingItem.css({'position':'relative','left': dragItemStartX,'top': dragItemStartY});
						this._reorderItemIndex = this._touchItemIndex + 1;
					}

					//this.fireEvent("beforeDrag", [this._$draggingItem]);

					this._InitializeMoveEvent = true;

					this._$reorderItem.addClass(this._config.reorderItemClass);

					this._disableTransition(this._$draggingItem)
				}
			}

			// 在初始化拖动后才禁止默认事件行为
			event.preventDefault();

			var cssX, cssY;
			// 计算触控点移动距离
			cssX = Move_ex - this._eventStartX;
			cssY = Move_ey - this._eventStartY;

			if(this._hardConfig._reorderCSS){
				// 计算触控点移动距离
				cssX = this._draggingItemStartPos.left + cssX;
				cssY = this._draggingItemStartPos.top + cssY;
			}else{
				// 若不适用CSS3的属性transform, 只能使用css坐标来拖拽
				if (this._transformsEnabled === false) {
					//_$draggingItem拖拽时的位置 = 它的坐标 + 拖拽距离
					cssX = dragItemStartX + cssX;
					cssY = dragItemStartY + cssY;
				}
			}

			// 拖拽
			this._setPosition(this._$draggingItem, {'left': cssX, 'top': cssY});
			//this._$draggingItem.css({'left':Move_ex - eX, 'top':Move_ey - eY});// 测试用, 没有优化动画的模式

			// 重新排序
			this._reorder(cssX, cssY);
		},

		_getTouchIndex: function(touchX, touchY){
			// 不能超出容器范围
			if(touchX < 0 ||touchX > this._containerW || touchY < 0 ||touchY > this._containerH){
				return
			}
			var curCol = Math.floor(touchX/this._itemW) + 1;// 列数
			var curRow = Math.floor(touchY/this._itemH);// 行数
			return (curRow * this._containerCols + curCol - 1);// 计算值 = (坐标行数-1)*容器列数 + 坐标列数 -1;
		},

		_reorder: function(cssX, cssY) {
			/* 思路1: 监听触控点位置来插入空白格子 */
			// 1, 计算触控点位置
			// 2, 计算target的文档位置
			// 3, 以1与2的相对位置, 整除_itemW和_itemH得出触控点所在的li的序号index, 以此作为插入的位置
			// 但Bug!!! 缩放屏幕会出现偏差. 根本原因是步骤1与2的获取位置的原理不同, 缩放时各自变化比例不同, 所以不能同时使用思路1

			/* 思路2: 监听拖动项的中心位置来插入空白格子 */
			// 1, 计算target中心的初始位置targetCenterStart, 直接获取this.targetCenterStartX,this.targetCenterStartY
			// 2, 计算拖拽时target中心位置的坐标targetCenterPos

			var targetCenterPosX, targetCenterPosY;

			if(this._hardConfig._reorderCSS){
				targetCenterPosX = cssX + this._itemW/2;
				targetCenterPosY = cssY + this._itemW/2;
			}else{
				targetCenterPosX = this.targetCenterStartX + cssX;
				targetCenterPosY = this.targetCenterStartY + cssY;
			}

			// 3, 以targetCenterPos坐标来计算触控点所在的li的序号位置calcIndex
			var calcIndex = this._getTouchIndex(targetCenterPosX, targetCenterPosY);

			// 4,
			var reorderIndex;

			if(this._hardConfig._reorderCSS){
				// 基于绝对定位, 不用考虑文本流的插入index值的调整
				if(calcIndex >= 0 && calcIndex < this._draggableCount){
					reorderIndex = calcIndex;
				}
			}else{
				// 基于文本流的插入, 需要index值的调整
				// 以计算值calcIndex来得出插入位置reorderIndex, 基于在获取其他item来使用before插入activeItem的的原理
				// 区间1[负数 - 0] -->为0
				// 区间2[0 - initialIndex] -->为calcIndex
				// 区间3[initialIndex - this.draggableCount] -->为initialIndex
				// 区间4[this.draggableCount - 无限大] -->为draggableCount
				if(calcIndex < 0){
					reorderIndex = 0;
				}else if(calcIndex < this._touchItemIndex){
					reorderIndex = calcIndex;
				} else if (calcIndex >= this._draggableCount){
					reorderIndex = this._draggableCount;
				} else if (calcIndex >= this._touchItemIndex){
					reorderIndex = calcIndex + 1;
				}

			}
			if(reorderIndex === this._reorderItemIndex){
				// 位移未超出一个li位置, 就取消执行
				return false;
			} else {
				if(this._hardConfig._reorderCSS){
					//console.log('点击  ', this._reorderItemIndex,'计算', calcIndex);
					this._reorderFn(this._reorderItemsAry, this._reorderItemIndex, reorderIndex);
					this._reorderFn(this._indexAry, this._reorderItemIndex, reorderIndex);
					console.log(this._indexAry);
					this._setItemsPos(this._reorderItemsAry);
				}else{
					// 5, 以reorderIndex作为插入的位置
					this._$items.eq(reorderIndex).before(this._$reorderItem);
				}
				// 记录本次位置
				this._reorderItemIndex = reorderIndex;
			} // 对比思路1, 由于位移的cssX与cssY是稳定的, 判断插入的位置只是基于文档位置的获取机制, 所以可以.
		},

		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/

		_applyTransition: function($obj) {
			// 添加css  Transition
			var transition = {};

			transition[this._transitionType] = this._transformType + ' ' + this._config.cssDuration + 'ms ' + this._hardConfig._transitionTiming;

			$obj.css(transition);
		},

		_disableTransition: function($obj) {
			// 去掉css  Transition
			var transition = {};

			transition[this._transitionType] = '';

			$obj.css(transition);
		},

		_setProps: function() {
			// 1, 选择事件类型
			// 2, 检测判断:
			// cssTransitions
			// 3, 设置前缀:
			// animType/ transformType/ transitionType
			// 4, 检测判断:
			// transformsEnabled = 根据_useTransform正反基础, 检测animType不为null与false

			var bodyStyle = document.body.style;

			// 选择事件类型, 添加命名空间, 不会与其他插件冲突
			this._startEvent = this._hasTouch ? 'touchstart.DraggableMenu': 'mousedown.DraggableMenu';
			this._stopEvent = this._hasTouch ? 'touchend.DraggableMenu': 'mouseup.DraggableMenu';
			this._moveEvent = this._hasTouch ? 'touchmove.DraggableMenu': 'mousemove.DraggableMenu';

			if (bodyStyle.WebkitTransition !== undefined ||
				bodyStyle.MozTransition !== undefined ||
				bodyStyle.msTransition !== undefined) {
				if (this._hardConfig._useCSS === true) { //_config是提供用户的选择, 但要使用的话, 需检测环境能否
					this._cssTransitions = true;
				}
			}
			/*setProps的主要作用之一:检测可使用的前缀, 可以用来借鉴, Perspective更小众*/
			if (bodyStyle.OTransform !== undefined) {
				this._animType = 'OTransform';
				this._transformType = '-o-transform';
				this._transitionType = 'OTransition';
				if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) this._animType = false;
			}
			if (bodyStyle.MozTransform !== undefined) {
				this._animType = 'MozTransform';
				this._transformType = '-moz-transform';
				this._transitionType = 'MozTransition';
				if (bodyStyle.perspectiveProperty === undefined && bodyStyle.MozPerspective === undefined) this._animType = false;
			}
			if (bodyStyle.webkitTransform !== undefined) {
				this._animType = 'webkitTransform';
				this._transformType = '-webkit-transform';
				this._transitionType = 'webkitTransition';
				if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) this._animType = false;
			}
			if (bodyStyle.msTransform !== undefined) {
				this._animType = 'msTransform';
				this._transformType = '-ms-transform';
				this._transitionType = 'msTransition';
				if (bodyStyle.msTransform === undefined) this._animType = false;
			}
			if (bodyStyle.transform !== undefined && this._animType !== false) {
				this._animType = 'transform';
				this._transformType = 'transform';
				this._transitionType = 'transition';
			}
			this._transformsEnabled = this._hardConfig._useTransform && (this._animType !== null && this._animType !== false);
			//this._transformsEnabled = false;// 测试用
			//this._cssTransitions = false;// 测试用
		},

		_setPosition: function($obj, position) {
			// 方法setCSS: 即时位置调整
			var positionProps = {},
				x, y;

			x =  Math.ceil(position.left) + 'px';
			y =  Math.ceil(position.top) + 'px';

			if (this._transformsEnabled === false) {
				$obj.css({'left': x, "top": y});
			} else {
				positionProps = {};
				if (this._cssTransitions === false) {
					positionProps[this._animType] = 'translate(' + x + ', ' + y + ')';
					$obj.css(positionProps);
					//console.log(positionProps)
				} else {
					positionProps[this._animType] = 'translate3d(' + x + ', ' + y + ', 0px)';
					$obj.css(positionProps);
					//console.log(positionProps)
				}
			}
		},

		_animateSlide: function($obj, position, callback) {
			// 方法animateSlide: 位置调整的动画滑动效果, 且接收callback
			var animProps = {}, DrM = this;

			if (this._transformsEnabled === false) {
				// 降级方案 使用animate方案
				$obj.animate(position, this._config.cssDuration, 'swing', callback);
			} else {

				if (this._cssTransitions === false) {
					// 使用translate的CSS方法, 需要获取到_$draggingItem的translate位置
					// 获取本对象_$draggingItem的css属性translate的值:
					var objOriginal = this._$draggingItem[0].style.transform,
						objOriginalX = Number(objOriginal.substring(10, objOriginal.indexOf("px"))),
						objOriginalY = Number(objOriginal.substring(objOriginal.lastIndexOf(",") + 1, objOriginal.lastIndexOf("px")));

					var startPosition = {"left":objOriginalX, "top":objOriginalY},
						curPosition = {"left":objOriginalX, "top":objOriginalY},
						pr = {};

					$(startPosition)// 这个位置是拖拽的最后的位置, 也就是_moveEvent的位置
						.animate(position, {
							duration: this._config.cssDuration,
							step: function(now, data) {
								pr[data.prop] = now;
								$.extend(curPosition, pr);
								animProps[DrM._animType] = 'translate(' +
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
					this._applyTransition($obj);

					animProps[this._animType] = 'translate3d(' + position.left + 'px, ' + position.top + 'px, 0px)';

					$obj.css(animProps);


					if (callback) {
						setTimeout(function() {

							//DrM._disableTransition($obj);

							callback.call();
						}, this._config.cssDuration);
					}
				}

			}

		},





		// 方法: 获取触控点坐标
		_page :  function (coord, event) {
			return (this._hasTouch? event.originalEvent.touches[0]: event)['page' + coord.toUpperCase()];
		}

	};

	return (typeof define !== 'undefined') ? DraggableMenu : (window.DraggableMenu = DraggableMenu);

}));

