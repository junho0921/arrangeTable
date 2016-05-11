/* 依赖: jQuery, cssProp(by jun)*/

/* arrangeTable v3.0*/


(function(factory) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['jquery', 'cssProp'], factory);
	} else if (typeof exports !== 'undefined') {
		module.exports = factory(require('jquery'));
	} else {
		factory(jQuery);
	}

}(function($) {
	'use strict';

	var gadget = $.fn.gadget, timeFunc;// 引用cssProp插件

	var arrangeTable = function ($container, options, view) {
		this.initialize($container, options, view);
		return this;
	};

	arrangeTable.prototype = {
		initialize: function($container, options, view) {
			this._$DOM = view ? view.$el : $(document);
			this._$container = $container.css({position: 'relative', padding: 0, overflow: 'hidden'});
			this._config = $.extend({}, this._defaultConfig, options, this._staticConfig);

			this._getTableDomSize();// 获取当前页面信息

			this._itemsHandler  = new UiItems (this._renderContent(this._config.dataList), this._config, this._domSize, this._$container);
			this._targetHandler = new UiTarget(this._itemsHandler, this._config);

			this._showContent(this._itemsHandler.$el); // 渲染内容

			this._itemsHandler.$el
				// 绑定关闭按钮事件
				.onUiStart('.' + this._config.class.closeBtn, $.proxy(this._clickCloseBtnFn, this))
				// 绑定touchStart事件
				.onUiStart($.proxy(this._uiStartHandler, this));
		},

		/*
		 * 接口
		 * */
		_defaultConfig: {
			// 渲染html的数据内容
			dataList: null,
			// 渲染html的方法
			renderer: function(data, i, datas){
				// 本方法提供给用户修改, 但要求必须返回html字符串作为每个item的内容
				return $('<li>').addClass('item').append(
					$('<div>')
						.attr({'id': data.id})
						.append($('<i class="list-ico">').addClass(data.icon))
						.append($('<span>').text(data.text))
				);
			},
			// 公开事件: 正常点击事件
			onItemTap: null,
			// 公开事件: 拖放后的事件
			onDragEnd: null,
			// 公开事件: 删除item的事件
			onClose: null,
			// 公开事件: 进入编辑模式的事件
			onEditing: null
		},

		/**
		 * 容器对象
		 */
		_$container: null,
		/**
		 * items集合
		 */
		_itemsHandler: null,
		/**
		 * 操作对象
		 */
		_targetHandler: null,
		/**
		 * 正在编辑的对象
		 */
		_$editingItem: null,

		// 组件涉及的DOM尺寸, 对象
		_domSize: null,

		/*
		 * touchStart的坐标
		 * */
		_eventStartPos: null,

		/*
		 * touchStart时间点
		 * */
		_startTime: null,
		_stopTime: 0,

		/*
		 * 不可拖动与可拖动的数量
		 * */
		_staticCount: 0,

		/*
		 * 固定设置
		 * */
		_staticConfig :{
			// 长按的时间间隔
			pressDuration: 300,
			// 排序效果动画的过度时间transition-duration值
			reorderDuration: 300,
			// 放大效果动画的过度时间transition-duration值
			focusDuration: 80,
			// 类名
			class: {
				staticItem: 'DrM-staticItem',
				closeBtn  : 'DrM-closeBtn',
				touchItem : 'DrM-activeItem',// 激活的item, 包括拖动的item和排序的item
				ghostItem : 'DrM-ghostItem',// ghostItem是提供给用户修改拖拽时, 底部显示的item的样式, 默认是隐藏样式
				dragItem  : 'DrM-dragItem',
				editItem  : 'DrM-editItem',	// 编辑中的item
				reItem    : 'DrM-reItem'// dragItem在释放拖拽一瞬间到回归位置的状态
			}
		},

		_collectUiData: function(attr, value){// 逻辑数据的收集, 与效果无关的用户操作数据
			this['_' + attr] = value
		},

		_triggerApi: function (method, params){
			this._config[method].apply(this, params);
		},

		/*=========================================初始化功夫============================================*/
		/*==============================================================================================*/

		_renderContent: function(data){
			// 填充template内容并收集所有item的html的jQuery包装集
			var $renderWrap = $('<div>');
			if(!data) {return}

			for(var i = 0; i < data.length; i++){
				var $itemHtml = this._config.renderer(data[i], i, data)// 根据用户的自定义模板填进数据
					.data('DrM-dataDetail', data[i]);
				if(data[i].static){
					$itemHtml.addClass(this._config.class.staticItem);
					this._staticCount++;// 记数
				}
				$renderWrap.append($itemHtml)
			}
			return $renderWrap.children();
		},

		_showContent: function($items){
			this._$container.html($items);
		},

		_getTableDomSize: function(isCalcByDomData){
			// 先渲染一个items来获取页面渲染的基本item尺寸数据
			var $preItem = this._renderContent(this._config.dataList.slice(0, 1));

			this._showContent($preItem);

			var domSize = this._domSize = {
				gridsLength: this._config.dataList.length,
				gridH : $preItem.outerHeight(true),
				gridW : $preItem.outerWidth(true),
				containerW : this._$container.width()
			};

			if(isCalcByDomData){ //todo 计算不精确
				// 遍历方法来计算容器列数, 方法是计算第i个换行的,那i就是列数, 这方法的意义是按照css设计者的样式计算
				for(var i = 0; i < domSize.gridsLength; i++){
					if($preItem[i].position().top > 1){
						domSize.containerCols = i;
						break;
					}
				}
				domSize.containerCols = domSize.containerCols || domSize.gridsLength;
			}else{
				domSize.containerCols = Math.floor(domSize.containerW / domSize.gridW);
			}

			domSize.containerH = Math.ceil(domSize.gridsLength / domSize.containerCols) * domSize.gridH;
		},

		/*=======================================事件发展==============================================*/
		/*============================================================================================*/

		_uiStartHandler :function(event){
			var $e = $(event.currentTarget), touchTime = event.timeStamp || +new Date(), _this = this;
			var isTargetStatic = $e.hasClass(this._config.class.staticItem);
			var isReTouchTooFast = touchTime - this._stopTime < this._config.reorderDuration;

			if(isReTouchTooFast){return}// 看来操作的条件没有状态判断

			this._targetHandler.is($e);

			this._collectUiData('startTime', touchTime);
			this._collectUiData('eventStartPos', gadget.getTouchPos(event));

			// bind touchEnd
			this._$DOM.oneUiStop($.proxy(this._uiStopHandler, this));

			if(!isTargetStatic){
				// if Press, to enter editMode
				timeFunc = setTimeout(function(){
					_this._enterEditMode();
				}, this._config.pressDuration);
				// bind touchMove
				this._$DOM.oneUiProcess($.proxy(this._uiProcessInit, this));
			}
		},

		/*
		 进入编辑模式: target --> editItem && dragItem
		 */
		_enterEditMode: function(){
			// 在编辑模式中, 再次进入编辑模式的话, 若不是原本对象, 先把原本对象转为正常item
			if(this._$editingItem && (!this._targetHandler.$el.is(this._$editingItem))){
				this._$editingItem.removeClass(this._config.class.editItem);
			}

			this._triggerApi('onEditing', [this._itemsHandler.$el, this._targetHandler.$el]);

			var $uiTarget =  this._targetHandler.toBeDragItem();

			this._collectUiData('$editingItem', $uiTarget.addClass(this._config.class.editItem));
		},

		_uiProcessInit: function(event){
			event.preventDefault();
			// this._sensitiveJudge(event)
			var isFlag = (event.timeStamp - this._startTime) < this._config.pressDuration;
			if (isFlag){ console.log('isFlag');
				this._cleanEvent();
				this._targetHandler.empty();
			}else {
				this._$DOM.onUiProcess($.proxy(this._uiProcessHandler, this));
			}
		},

		_uiProcessHandler: function(event){
			event.preventDefault();

			var touchMovePos  = gadget.getTouchPos(event),
				touchStartPos = this._eventStartPos;

			var movePos = [
				touchMovePos[0] - touchStartPos[0],
				touchMovePos[1] - touchStartPos[1]
			];

			this._targetHandler.followMove(movePos);//可以raf

			var floatGridIndex = this._targetHandler.getFloatGrid(movePos);//可以raf
			var floatGridPos = this._itemsHandler.getGridPos(floatGridIndex);

			if(floatGridPos !== this._targetHandler.currentGridPos){
				var currentGridIndex = this._itemsHandler.getVisualIndex(this._targetHandler.currentGridPos);
				this._itemsHandler.reorder(currentGridIndex, floatGridIndex);

				this._targetHandler.currentGridPos = floatGridPos;
			}
		},

		_uiStopHandler: function(event){
			this._collectUiData('stopTime', event.timeStamp);

			this._cleanEvent();

			var purpose = this._judgeUserAction(); //console.log('purpose = ', purpose);

			purpose && this._uiCallback[purpose].apply(this);

			this._targetHandler.empty();
		},

		_judgeUserAction: function(){
			var isPress = (this._stopTime - this._startTime) > this._config.pressDuration;
			if(isPress && this._$editingItem){
				var isDragToReorder = this._targetHandler.currentGridPos !== this._targetHandler.startGridPos;
				if(isDragToReorder){
					return 'forReorder';
				} else {
					return 'forEnterEdit';
				}
			} else if(!isPress){
				if(!this._$editingItem){
					return 'forTap';
				} else {
					return 'forQuitEdit';
				}
			}
		},

		_uiCallback: {
			forReorder: function(){
				var callback = $.proxy(function(){
					this._quitEditMode();

					this._triggerApi('onDragEnd', [this._itemsHandler.$el]);
				}, this);
				this._targetHandler.reset(callback);
			},
			forEnterEdit: function(){
				this._targetHandler.reset();
			},
			forTap: function(){
				var itemData = this._targetHandler.$el.data('DrM-dataDetail');
				this._triggerApi('onItemTap', [itemData]);
			},
			forQuitEdit: function(){
				this._quitEditMode();
			}
		},
		/*
		 退出编辑模式:
		 editItem --> item
		 数据清空
		 */
		_quitEditMode: function(){
			if(!this._$editingItem){return}

			this._$editingItem.removeClass(this._config.class.editItem);

			this._collectUiData('$editingItem', null);
		},

		_clickCloseBtnFn: function(e){
			var targetIndex = this._itemsHandler.getVisualIndex($(e.delegateTarget));

			this._itemsHandler.delete(targetIndex);

			this._quitEditMode();

			this._triggerApi('onClose', [this._itemsHandler.$el]);

			this._collectUiData('stopTime', event.timeStamp);
		},

		_cleanEvent: function(){
			clearTimeout(timeFunc);

			this._$DOM.offUiProcess();

			this._$DOM.offUiStop();
		},

		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------  以下方法没有用上, 备用  -----------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/

		_sensitiveJudge: function(event){
			// move过程中对事件的判断有两个重要变量: 延时与范围
			// 都满足: 按住拉动
			// 都不满足: swipe
			// 满足2, 不满足1: 是触控微动, 不停止, 只是忽略
			// 满足1, 不满足2: 是错位, 可以理解是双触点, 按住了一点, 满足时间后立即同时点下第二点
			// 在app实际运行时, 触控滑动监听的_moveEvent事件比较灵敏, 即使是快速touchMove, 也计算出触控点位置仅仅移动了1px, 也就是Move_ey - this._eventStartPos[1] = 1px, 所以这里在未满足时间情况完全不考虑触控点移动而直接停止方法return出来

			// 允许触控的边缘值, 单位px
			this._config.rangeXY = 4;

			var inShort = (event.timeStamp - this._startTime) < this._config.pressDuration;
			var Move_ex = gadget.getTouchX(event),
				Move_ey = gadget.getTouchY(event);

			console.log('pc模式判断事件');
			var rangeXY = this._config.rangeXY;
			var outRang = (Move_ex - this._eventStartPos[0] ) > rangeXY || (Move_ey - this._eventStartPos[1]) > rangeXY;

			if (inShort){
				// 非灵敏模式, 区分触控点变化范围
				console.log(Math.abs(Move_ex - this._eventStartPos[0]), Math.abs(Move_ey - this._eventStartPos[1]));
				if(Math.abs(Move_ex - this._eventStartPos[0]) > rangeXY || Math.abs(Move_ey - this._eventStartPos[1]) > rangeXY){
					console.log('非拖拽的swipe');
					this._cleanEvent();
					return;
				} else {
					// 允许微动, 忽略(return)本次操作, 不停止绑定_moveEvent事件, 因为只是微动或震动, 是允许范围
					console.log('允许微动, 忽略(return)本次操作, 可继续绑定触发_moveEvent');
					return;
				}
			}
			// 条件2: 范围外  ps:建议范围rangeXY不要太大, 否则变成了定时拖动.
			if(outRang){
				console.warn('按住达到一定时间后瞬间move超距离, 认为是操作失误');
				this._cleanEvent();
				return false;
			}
		}
	};

	function UiItems () {
		return this.init.apply(this, arguments);
	}
	UiItems.prototype = {
		/*
		 * 绝对定位模式的items控制器,
		 * 功能: 1,控制位置; 2,提供获取视觉index位置方法; 3,删除items; 4,container的autoHeight方法
		 * 目标: 模拟文本流定位的items控制
		 * */
		gridPosAry:null, // 位置
		$el:null,
		domSize:null,
		config:null,
		$container:null,

		init: function($el, config, domSize, $container){
			// 计算静态位置数组与items的序号数组
			// 数组保存:格子数量和各格子坐标, 优点: 避免重复计算
			this.$el = $el;
			this.domSize = domSize;
			this.config = config;
			this.$container = $container;

			this.gridPosAry = [];
			for(var i = 0; i < this.domSize.gridsLength; i++){
				var inRow = Math.floor(i / this.domSize.containerCols);
				var inCol = i % this.domSize.containerCols;
				this.gridPosAry.push([inCol * this.domSize.gridW, inRow * this.domSize.gridH]);
			}

			this.$el // set items float state
				.transition({duration: this.config.reorderDuration})
				.css({position: 'absolute', left: 0, top: 0});

			this.setItemsPos(); // set items float position

			this.containerAutoHeight();

			return this;
		},
		getGridPos: function(index){
			var type = $.type(index);
			if(type == 'number'){
				return this.gridPosAry[index];
			} else if(type == 'object'){
				return index.data('pos');
			} else { return 0}
		},
		getVisualIndex: function(param){
			/*以点击的对象所在的格子pos来判断在视觉上的位置*/
			if(param == undefined){return 0}
			var pos = $.type(param) == 'array' ? param : this.getGridPos(param);
			return $.inArray(pos, this.gridPosAry);
		},
		saveGridPosCache: function($target, pos){ // gridPosAry与saveGridPosCache方法是最好的利器, 使得getGridPos与getVisualIndex都简单直接了
			$target.data('pos', pos);
		},
		reorder: function(originalPos, newPos){
			var reorderItem = this.$el.splice(originalPos, 1)[0];// 抽出
			this.$el.splice(newPos, 0, reorderItem);// 指定插入
			// 定位的item不包含dragItem自身, 所以范围是[originalPos, newPos - 1]
			var startItemIndex, stopItemIndex;
			if(originalPos > newPos){ // 排序的item是有选择的, 在出与入位置的中间item, 不包含dragItem
				startItemIndex = newPos + 1;
				stopItemIndex = originalPos + 1;
			} else {
				startItemIndex = originalPos;
				stopItemIndex = newPos;
			}

			this.setItemsPos([startItemIndex, stopItemIndex]);
		},
		delete: function(deletePos){
			var deleteItem = this.$el.splice(deletePos, 1)[0]; console.log('删除的item = ', deleteItem);
			$(deleteItem).remove();
			this.setItemsPos();
			this.domSize.gridsLength--;
			this.containerAutoHeight();
		},
		setItemsPos: function(arrange){
			var _itemsHandler = this;
			var startIndex = (arrange && arrange[0]) || 0;// startIndex的意义是拖拽排序时, 只有连续items需要排序
			var $target = arrange ? (this.$el.slice(arrange[0], arrange[1])) : this.$el;
			$target.each(function(i, item){
				var $e = $(item);
				var pos = _itemsHandler.getGridPos(i + startIndex);
				$e.transform({pos: pos, scale: [1, 1, 1]});
				_itemsHandler.saveGridPosCache($e, pos);
			});
		},
		containerAutoHeight: function(){
			this.$container.height(
				this.domSize.containerH = Math.ceil(this.domSize.gridsLength / this.domSize.containerCols) * this.domSize.gridH
			);
		},
		getIndexByPointPos: function(pos){
			/* 以target中心坐标, 计算该点所在格子的index */
			var centerX = pos[0] + this.domSize.gridW / 2,
				centerY = pos[1] + this.domSize.gridH / 2;
			var curCol = Math.floor(centerX / this.domSize.gridW) + 1,// 列数
				curRow = Math.floor(centerY / this.domSize.gridH);// 行数
			var floatIndex = (curRow * this.domSize.containerCols + curCol - 1);
			var max = this.domSize.gridsLength - 1;
			//var max = this.domSize.gridsLength - this.context._staticCount;
			floatIndex = floatIndex < max ? (floatIndex >= 0 ? floatIndex : 0) : max;
			return floatIndex;// 计算值 = (坐标行数-1)*容器列数 + 坐标列数 -1;
		}
	};

	function UiTarget () {
		return this.init.apply(this, arguments);
	}
	UiTarget.prototype = {
		/*为何要独立dragItem, 因为这里关注的是动画效果, 不是逻辑, 放大, 拖拽, 缩小并归位都是动画*/
		$el: null,
		$ghost: null,
		startGridPos: null,
		currentGridPos: null,
		itemsHandler:null,
		config:null,
		init:function(itemsHandler, config){
			this.itemsHandler = itemsHandler;
			this.config = config;
			return this;
		},
		is: function($e){
			this.currentGridPos = this.startGridPos = this.itemsHandler.getGridPos($e);
			this.$el = $e.addClass(this.config.class.touchItem);
		},
		toBeDragItem:function(){
			this.$el.addClass(this.config.class.dragItem);
			this.magnify();
			return this.$el;
		},
		empty:function(){
			this.$el.removeClass(this.config.class.touchItem);
			this.$el = this.currentGridPos = this.startGridPos = null;
		},
		magnify:function(){
			var $target = this.$el;
			$target
				.css({'z-index': 1001})
				.transition({duration: this.config.focusDuration})
				.transitionEnd(function(){$target.transition({duration:0});})
				.transform({
					pos: this.startGridPos,
					scale: [1.2, 1.2, 1.2]
				});
		},
		reset: function(callback){
			/*释放dragItem事件包含缩放与归位两个动画, 还提供callback*/
			this.$el
				.removeClass(this.config.class.dragItem)
				.transition({
					duration: this.config.reorderDuration
				})
				.css({'z-index': 1})
				.transitionEnd(function(){
					console.log('transitionEnd');
					if(callback){callback()}
				})
				.transform({
					pos: this.currentGridPos,
					scale: [1, 1, 1]
				});
			this.itemsHandler.saveGridPosCache(this.$el, this.currentGridPos);// 存储位置
		},
		followMove: function (movePos) {
			// 这就分离了touchMove关注的是pos的数据更新, 动画效果交由本cssHandler处理
			this.$el.transform({
				pos: [
					this.startGridPos[0] + movePos[0],
					this.startGridPos[1] + movePos[1]
				],
				scale: [1.2, 1.2, 1.2]
			});
			// ghostItem reorder
		},
		getFloatGrid: function(movePos){
			var pos = [
				this.startGridPos[0] + movePos[0],
				this.startGridPos[1] + movePos[1]
			];
			return this.itemsHandler.getIndexByPointPos(pos);
		}
	};

	return (typeof define !== 'undefined') ? arrangeTable : (window.arrangeTable = arrangeTable);
}));

