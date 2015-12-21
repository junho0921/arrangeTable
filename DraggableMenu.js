/* 依赖: jQuery*/

/* 混合模式v2.0*/

/*
事件操作:<br/>
	点击item --> 跳转页面<br/>
	长按item --> 进入编辑模式 --> 松开item --> 点击任何item, 退出编辑模式<br/>
	长按item --> 进入编辑模式 --> 松开item --> 点击关闭按钮, 删除编辑的item, 退出编辑模式<br/>
	长按item --> 进入编辑模式 --> 拖拽item --> 拖动到新位置, items排序, 让出位置给排序item --> 在新位置松开item --> 被拖动的item有滑动归位效果<br/>

模式1: 文本流拖拽

	原理:
		item以position:relative布局,
		特点: 视觉与文本位置一致
	事件:
		 获取位置:
		 	点击对象所获取的位置是文本文本位置, 也就是视觉位置
		 拖拽:
		 	克隆item并插入到最后文本位置, 设css定位到原位, 动画效果技术: translate3D和transition
		 排序:
		 	基于文本位置, 使用before方法插入就可以, 各item的文本位置自动更新
		 删除item:
		 	删除后, 各item的文本位置自动更新

模式2: 浮动拖拽

	原理:
		全部item以position:absolute且靠左上角, 排列布局使用translate3D改变xy轴是各个item有自己位置
		特点: 视觉位置与文本位置脱离关系
	事件:
		获取位置:
            点击对象所获取的位置是文本文本位置, 不能直接获取视觉位置
			措施:
				定义可排序的数组变量indexAry来模拟文本位置与模拟DOM结构变化, 反映视觉位置
		拖拽:
			克隆item(同时已经克隆了位置等属性), 动画效果技术: translate3D和transition
		排序:
			不排序DOM结构即文本位置, 只做视觉排序. 对indexAry进行排序, items按照indexAry来浮动定位在对应的视觉位置来做出"排位"效果
		删除item:
			删除后, 对indexAry进行处理(模拟文本流的删除item效果: 在indexAry里删除item序号, 然后对大于该序号的序号都减一), 这样就及时反映文本位置在视觉位置情况

	模拟步骤:
	初始化:
		 根据dataList数据渲染页面
		 创建变量:
		    1, 使用this._$items作为排序数组(因为是jQuery对象数组, 可排序)
		    2, 变量posAry数组, 作为位置对应值
		    3, 变量indexAry是items的文本位置数组, 有顺序, 反应items的文本位置对应视觉位置
		 例子: $items = [$1, $2, $3, $4, $5, $6]; indexAry = [1, 2, 3, 4, 5, 6];
		 以$items作为排序数组, 取值posAry, 进行_setItemsPos方法"定位"
		 完成了定位布局
	进行ui交互:
		 情况1:
			 描述: 排序后: $items = [$0, $1, $2, $4, $5, $3, $6]; indexAry = [0, 1, 2, 4, 5, 3, 6];
			 点击item3, 如何拖拽item?? --> 如何获取定位? --> 获取item的translate值? 不, 难在兼容各浏览器, 所以在posAry里获取位置 --> 但点击获取的index值是DOM的index值=3, 不是现在视觉位置的序号5, --> 在indexAry里获得 index = 5 --> 现在就可以在posAry里获取位置了 --> 可以拖动
			 同理, 没有拖拽, 但点击item3, 如何获取item3在dataList的数据呢?? --> 同理, 获取到所在格子序号5 --> 获取dataList里序号5的内容(因为dataList按照文本位置顺序排列数组, 只需要获取文本位置就可以得到dataList相应数据), 但现在使用jQuery方法data来绑定dataList数据在jQuery对象里, 直接获取就可以了
		 情况2:
			 描述: 拖拽时, 重新排序reorder
			 由于posAry已有位置坐标, 需要对象有新的排序 --> 对$items排序与indexAry排序, 保留DOM结构不变即文本位置不变 --> 重新排序的$items便可以填进posAry的格子坐标里
		 情况3:2
			 描述: 点击关闭按钮,
				 这属于编辑模式, 区别于情况1,2, 这里需要整理数组$items与indexAry以反映实际情况
				 1, 更新$items: 除掉$items数组里的该item, 使$items数组反映当前显示的items
				 2, 更新indexAry: 除掉indexAry数组里的该item序号并对大于该序号的序号都减一, 反映文本位置的实际视觉位置顺序
				 3, 以$items为对象, 使用方法setPosition"定位"items, 因有transition, 所以有排序效果
				 4, 执行remove删除的item

已优化部分
	1, 使用类方法
	2, 或添加关闭按钮
	3, 限定拖动范围
	4, 禁止多点触控(参考slick的swipeHandler里的方法)
	5, touch事件命名空间
	6, 拖拽时候, target是没有btn的, 所以需要添加一个class以至于可以隐藏
	7, 类私有变量和方法都使用下划线开头, 区分公开的变量方法
	8, $.proxy(func, this);
	9, 关闭按钮的容器高度调整为适应高度

改进空间:
	1, 考虑转屏问题orientationchange, resize??
	2, 剥离transition等的方法成为一个组件
	4, 去掉变量数组模拟文本流的
	5,

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

			/*测试*/
			for(var i = 0; i < this._config.dataList.length; i++){
				this._config.dataList[i].url = this._config.dataList[i].text
			}

			this._closeBtnClass = "." + $(this._staticConfig.closeBtnHtml)[0].className;

			this._$container = $(this._config.container).css({'position': 'relative', "padding":0});

			if(this._staticConfig._templateRender && this._config.dataList.length){
				this._render();
			}

			this._size();

			this._setProps();

			if(this._staticConfig._reorderCSS){ // 以下方法应该独立为一个方法:
				// 各item都绝对定位在(0, 0)css坐标
				this._$items.css({'position':'absolute', 'top':0, 'left': 0});
				// 获取初始排序的数组, 以item文本位置序号为内容的数组
				for(var i = 0; i < this._$items.length; i++){
					this._indexAry.push(
						i // i是文本位置的序号
					);
				}
				// 根据容器的尺寸计算出一个数组, 长度为items.length, 内容是格子左上角坐标
				this._getPosAry();
				// 使用translate来填坑
				this._setItemsPos(this._$items);
				// 延迟使用transition, 避免初始化的生成html所带有的动画
				setTimeout($.proxy(function(){
					this._applyTransition(this._$items);
				}, this), 1)
			}

			this._$items.on(this._startEvent, this._startEventFunc);
		},

		/*
		 * 默认设置
		 * */
		_defaultConfig: {
			// 容器对象
			container:".draggableMenu",

			// 长按的时间间隔
			pressDuration: 300,
			// 动画的时间长度
			cssDuration: 400,
			// 允许触控的边缘值, 单位px
			rangeXY: 12,

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
		 * reorderItem现在的位置序号, 也是作为进入编辑模式的item所在视觉位置序号
		 * */
		_reorderItemIndex: null,

		/*
		 * reorderItem视觉位置
		 * */
		_visualIndex: null,

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
		_staticCount: 0,
		_draggableCount: 0,

		/*
		 * 各item文本位置的数组, 有顺序
		 * */
		_indexAry:[],

		/*
		 * 格子的坐标
		 * */
		_posAry:[],

		/*
		 * 点击目标的原始数据
		 * */
		_$touchTargetData:null,

		/*
		 * 在基于relative的拖拽模式, 本变量保存上次视觉位置的index值, 不用每次使用.index()方法
		 * */
		MEMOvisionIndex:null,

		/*
		 * 固定设置, jun的开发配置
		 * */
		_staticConfig :{
			// class名称
			// 激活的item, 包括拖动的item和排序的item
			activeItemClass:"DrM-activeItem",
			// 排序的item
			reorderItemClass:"DrM-reorderItem",
			// 拖动的item
			draggingItemClass:"DrM-draggingItem",
			
			// 关闭按钮html:
			closeBtnHtml:"<span class='DrM-closeBtn'>-</span>",
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
					.data('dataDetail', data[i]);
				//.data('draggableMenuData', data[i]);// 对模板包装jQuery对象并添加数据
				if(data[i].static){
					$itemHtml.addClass('DrM-static');
					this._staticCount++;// 记数
				}
				$itemsHtml.push($itemHtml);// ps: 假设static项写在数组的最后
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


			// 遍历方法来计算容器列数, 方法是计算第i个换行的,那i就是列数
			for(var i = 0; i < this._$items.length; i++){
				// 只需要遍历到第二行就知道列数量了, 但判断的1px值有待优化
				if(this._$items.eq(i).position().top > 1){
					this._containerCols = i;
					break;
				}
			}
			this._containerCols = (this._containerCols === null)?this._$items.length:this._containerCols;

			// 锁定容器高度等于行数 * item的高度
			this._$container.css({'height':this._containerH = Math.ceil(this._$items.length/this._containerCols) * this._itemH, 'width':this._containerW, 'overfolow':'hidden'});
		},


		//_getIndexAry: function(){
		//	// 每次初始化与删除/添加item后, 都执行_getIndexAry方法
		//	// 清空_indexAry,以item文本位置序号为内容的数组
		//	this._indexAry = [];
		//	for(var i = 0; i < this._reorderItemsAry.length; i++){
		//		this._indexAry.push(
		//			i // i是文本位置的序号
		//		);
		//	}
		//	//console.log('this._indexAry', this._indexAry);
		//},
		// 根据容器的尺寸计算出一个数组, 长度为items.length, 内容是格子左上角坐标
		_getPosAry: function(){
			// 位置的静态写法
			// 数组保存:格子数量和各格子坐标, 优点: 避免重复计算
			var len = this._$items.length;
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
		},

		_setItemsPos: function($items, index1, index2){
			// index1, index2作为选择性执行的范围
			var len, st = 0;

			if(index1 && index2 && index1!== index2){
				if(index1 > index2){
					st = index2;
					len = index1 + 1;
				} else {
					st = index1;
					len = index2 + 1;
				}
			} else {
				len = $items.length;
			}

			for(var i = st; i < len; i++){
				this._setPosition($($items[i]), this._posAry[i])
			}
		},

		_reorderFn: function(targetAry, reorderItemIndex, newIndex){
			// 抽出
			var reorderItem = targetAry.splice(reorderItemIndex, 1)[0];
			// 指定插入
			targetAry.splice(newIndex, 0, reorderItem);
		},

		_startEventFunc :function(event){
			// 禁止多点触控
			var fingerCount = event.originalEvent && event.originalEvent.touches !== undefined ?
				event.originalEvent.touches.length: 1;
			if(fingerCount > 1){return;}

			this._$touchTarget = $(event.currentTarget);

			//console.log($.inArray(this._$touchTarget, this._$items));

			//this._$touchTargetData = this._$touchTarget.data('draggableMenuData');

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

			// 获取文本位置的序号
			this._textIndex = this._$touchTarget.addClass(this._staticConfig.activeItemClass).index();
			console.log(this._indexAry);

			if(this._staticConfig._reorderCSS){
				// 由于DOM结构固定, 所以需要在变量indexAry数组里获取DOM-index所在的视觉位置序号
				this._visualIndex = $.inArray(this._textIndex, this._indexAry);
			} else {
				this._visualIndex = this._textIndex;
			}
			//console.log('_visualIndex', this._visualIndex);

			// 获取本DOM的原始数据
			if(this._config.dataList){
				this._$touchTargetData = this._$touchTarget.data('dataDetail');//this._config.dataList[this._visualIndex];
			}

			// 绑定事件_stopEvent, 本方法必须在绑定拖拽事件之前
			$('body').one(this._stopEvent, this._stopEventFunc);

			var DrM = this;
			if(!this._$touchTargetData.static){
				// 设定时触发press, 因按下后到一定时间, 即使没有执行什么都会执行press和进行编辑模式
				this._setTimeFunc = setTimeout(function(){

					DrM._enterEditingMode();

					// 以pressDuration为间隔触发press事件
					//DrM.fireEvent("press",[this._$reorderItem]);
				}, this._config.pressDuration);

				// 绑定拖拽事件
				$('body').on(this._moveEvent, this._dragEventFn);
			}

		},

		_enterEditingMode: function(){
			if(!this._editing){
				this._editing = true;
			}else{
				if(this._$reorderItem === this._$touchTarget){
					return
				}else{
					this._$reorderItem.find(this._closeBtnClass).remove();
				}
			}
			// 进入编辑模式, 需要更新现在的排序位置reorderItemIndex为item对象的所在位置
			this._reorderItemIndex = this._visualIndex;

			// 提供外部执行的方法
			this._config.onEditing(this._$items);

			this._$reorderItem = this._$touchTarget
				.append(
				$(this._staticConfig.closeBtnHtml).css(this._staticConfig.closeBtnCss).on(this._startEvent, $.proxy(this._clickCloseBtnFn, this))
			);
		},

		_getVisionIndex: function(textIndex){
			return $.inArray(textIndex, this._indexAry);
		},

		_clickCloseBtnFn: function(){
			//console.log('格子序号', this._reorderItemIndex);

			// 说明: 变量reorderItemIndex是当前进行编辑模式的item所在视觉位置

			// 删除dataList里视觉位置的item原始数据
			//this._config.dataList.splice(this._reorderItemIndex, 1);

			if(this._staticConfig._reorderCSS){

				//console.log('删除item对象内容 ',
					// 删除reorderItemsAry里视觉位置的item
					this._$items.splice(this._reorderItemIndex, 1);
				//[0]);
				//console.log('删除后, 更新的对象集', this._$items);

				// 动画"定位"剩下的items
				this._setItemsPos(this._$items);

				var textIndex = this._$reorderItem.index();

				// 删除
				this._indexAry.splice(this._reorderItemIndex, 1);

				// 遍历更新
				for (var y = 0; y < this._indexAry.length; y++){
					var indexValue = this._indexAry[y];
					if(indexValue > textIndex){
						this._indexAry[y] = indexValue - 1;
					}
				}
			}

			// 调整容器的高度为适当高度
			var newH = Math.ceil(this._$items.length / this._containerCols) * this._itemH;
			this._$container.height(newH);

			// 删除本item
			this._$reorderItem.remove();
			// 提供外部执行的方法, 传参修改后的items对象集合
			this._config.onClose(this._$items);

			this._editing = false;
		},

		_stopEventFunc: function(){
			// 方法stopEventFunc功能:
			// 1,取消绑定moveEvent事件(但不负责取消_stopEvent事件);
			// 2,清理定时器;
			// 3,判断停止事件后触发的事件: A,有拖动item的话就动画执行item的回归
			// B,没有拖动的话, 思考是什么情况:
			// draggableMenu有三个应用情况: a, _stopEvent情况应用; b,moveEvent里的取消拖动的两种情况:太快, 触控变位(闪拉情况)
			//$('.draggableMenutittle3').text(''+ this._dragging);
			clearTimeout(this._setTimeFunc);

			$('body').off(this._moveEvent).off(this._stopEvent);

			if(this._InitializeMoveEvent){
				// 已经拖拽了的情况, 执行拖拽项的归位动画
				var DrM = this;

				this._dragItemReset(function(){
					DrM._$container.find('.' + DrM._staticConfig.draggingItemClass).remove();
					// 提供外部的方法, 传参排序后的jQuery对象集合
					DrM._$reorderItem.find(DrM._closeBtnClass).remove();

					DrM._editing = false;

					DrM._config.onDragEnd(DrM._$items);

					DrM._$container.children().removeClass(DrM._staticConfig.activeItemClass + " " + DrM._staticConfig.reorderItemClass);
					//DrM.fireEvent("afterDrag", [DrM._$reorderItem]);
				});

			}else{
				this._$container.children().removeClass(this._staticConfig.activeItemClass + " " + this._staticConfig.reorderItemClass);

				if(this._dragging === false){

					var newTime = new Date();

					if(newTime - this._startTime < this._staticConfig._clickDuration){ // 没有拖拽后且没有滑动且只在限制时间内才是click事件

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

		_dragItemReset: function(callback){
			// 本方法是计算dragItem基于touchStart位置面向的最终滑向位置, 最后执行动画

			var resetX, resetY;

			if(this._staticConfig._reorderCSS){
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
						this._$container.find("."+ this._staticConfig.activeItemClass).position().left // 需要重新获取元素,不能直接$dragTarget.position(). 因为这样得出的时$dragTarget基于位移之前的坐标, 而不是基于父级的坐标
						- this.dragItemOriginalpos.left;
					resetY = this._$container.find("."+ this._staticConfig.activeItemClass).position().top - this.dragItemOriginalpos.top;
				}
			}

			// 执行滑动效果
			this._animateSlide(this._$draggingItem, {'left': resetX, 'top': resetY}, callback);
		},

		_dragEventFn: function(event){
			var dragItemStartX, dragItemStartY;

			// draggableMenu里_moveEvent的理念是按住后拖动, 非立即拖动
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
					if(this._staticConfig._sensitive){
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

				// 条件2: 范围外  ps:建议范围rangeXY不要太大, 否则变成了定时拖动.
				var rangeXY = this._config.rangeXY;

				if(this._staticConfig._sensitive){
					rangeXY = rangeXY * 3;
				}

				var outRang = (Move_ex - this._eventStartX ) > rangeXY ||
					(Move_ey - this._eventStartY) > rangeXY;

				if(outRang){
					console.warn('按住达到一定时间后瞬间move超距离, 认为是操作失误');
					this._stopEventFunc();
					return false;
				}else{
					// 满足两个条件后, 初始化(仅进行一次)

					this._enterEditingMode();

					// 在基于relative拖拽的模式, 需要重新获取_$items, 否则this._$items仅仅指向旧有的集合, 不是新排序或调整的集合
					if(!this._staticConfig._reorderCSS){this._$items = this._$container.children();}

					// 重新获取可以拖拉的数量
					this._draggableCount = this._$items.length - this._staticCount;

					// 复制目标作为拖拽目标
					this._$draggingItem =
						this._$reorderItem.clone()
							.addClass(this._staticConfig.draggingItemClass)
							.css({'z-index':'99'})
							.appendTo(this._$container);// Bug: 改变了_$container的高度! 但可通过css固定高度

					this.dragItemOriginalpos = this._$draggingItem.position();

					// _$draggingItem的坐标调整等于$dragTarget的坐标
					if(this._staticConfig._reorderCSS){
						// $dragTarget的坐标 = reorderItem的坐标
						this._draggingItemStartPos = this._posAry[this._visualIndex];
						//console.log(this._posAry,this._visualIndex,  this._draggingItemStartPos);
						// 由于clone方法同时复制了位置属性, 所以不需要_setPosition来调整位置
						//this._setPosition(
						//	this._$draggingItem,
						//	this._draggingItemStartPos
						//);

						this._reorderItemIndex = this._visualIndex;
					}else{
						// $dragTarget的坐标 = 相对于reorderItem坐标与自身文本流坐标的差距
						dragItemStartX = this.itemStartPos.left - this._$draggingItem.position().left;
						dragItemStartY = this.itemStartPos.top - this._$draggingItem.position().top;
						this._$draggingItem.css({'position':'relative','left': dragItemStartX,'top': dragItemStartY});
						this._reorderItemIndex = this._visualIndex + 1;
						this.MEMOvisionIndex = this._visualIndex;
					}

					// 清空transition来实现无延迟拖拽
					this._disableTransition(this._$draggingItem);

					//this.fireEvent("beforeDrag", [this._$draggingItem]);

					this._InitializeMoveEvent = true;

					this._$reorderItem.addClass(this._staticConfig.reorderItemClass);

				}
			}

			// 在初始化拖动后才禁止默认事件行为
			event.preventDefault();

			var cssX, cssY;
			// 计算触控点移动距离
			cssX = Move_ex - this._eventStartX;
			cssY = Move_ey - this._eventStartY;

			if(this._staticConfig._reorderCSS){
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

			if(this._staticConfig._reorderCSS){
				targetCenterPosX = cssX + this._itemW/2;
				targetCenterPosY = cssY + this._itemW/2;
			}else{
				targetCenterPosX = this.targetCenterStartX + cssX;
				targetCenterPosY = this.targetCenterStartY + cssY;
			}

			// 3, 以targetCenterPos坐标来计算触控点所在视觉位置visionIndex
			var visionIndex = this._getTouchIndex(targetCenterPosX, targetCenterPosY) || 0;

			// 4, 排序位置
			var reorderIndex;

			if(this._staticConfig._reorderCSS){
				// 基于绝对定位, 不用考虑文本流的插入index值的调整
				if(visionIndex >= 0 && visionIndex < this._draggableCount){
					reorderIndex = visionIndex;
				} else if(visionIndex < 0){
					reorderIndex = 0;
				} else if(visionIndex >= this._draggableCount){
					reorderIndex = this._draggableCount - 1;
				}
			}else{
				// 基于文本流的插入, 需要index值的调整
				// 以计算值visionIndex来得出插入位置reorderIndex, 基于在获取其他item来使用before插入activeItem的的原理
				// 区间1[负数 - 0] -->为0
				// 区间2[0 - initialIndex] -->为visionIndex
				// 区间3[initialIndex - this.draggableCount] -->为initialIndex
				// 区间4[this.draggableCount - 无限大] -->为draggableCount
				if(visionIndex < 0){
					reorderIndex = 0;
				}else if(visionIndex < this._visualIndex){
					reorderIndex = visionIndex;
				} else if (visionIndex >= this._draggableCount){
					reorderIndex = this._draggableCount;
				} else if (visionIndex >= this._visualIndex){
					reorderIndex = visionIndex + 1;
				}

			}
			if(reorderIndex === this._reorderItemIndex){
				// 位移未超出一个li位置, 就取消执行
				return false;
			} else {
				if(this._staticConfig._reorderCSS){
					//console.log('点击  ', this._reorderItemIndex,'计算', visionIndex);
					this._reorderFn(this._$items, this._reorderItemIndex, reorderIndex);
					this._reorderFn(this._indexAry, this._reorderItemIndex, reorderIndex);
					console.log(this._indexAry);
					this._setItemsPos(this._$items, this._reorderItemIndex, reorderIndex);
					//this._reorderFn(this._config.dataList, this._reorderItemIndex, reorderIndex);
				}else{
					// 5, 以reorderIndex作为插入的位置
					this._$items.eq(reorderIndex).before(this._$reorderItem);

					//this._reorderFn(this._config.dataList, this.MEMOvisionIndex, visionIndex);

					// 记录本次调整后新的文本位置
					this.MEMOvisionIndex = visionIndex;
				}
				// 更新本次位置
				this._reorderItemIndex = reorderIndex;

			} // 对比思路1, 由于位移的cssX与cssY是稳定的, 判断插入的位置只是基于文档位置的获取机制, 所以可以.
		},

		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------  以下方法可另作组件公用  -----------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/

		_applyTransition: function($obj) {
			// 添加css  Transition
			var transition = {};

			transition[this._transitionType] = this._transformType + ' ' + this._config.cssDuration + 'ms ' + this._staticConfig._transitionTiming;

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
			this._startEvent = this._hasTouch ? 'touchstart.draggableMenu': 'mousedown.draggableMenu';
			this._stopEvent = this._hasTouch ? 'touchend.draggableMenu': 'mouseup.draggableMenu';
			this._moveEvent = this._hasTouch ? 'touchmove.draggableMenu': 'mousemove.draggableMenu';

			if (bodyStyle.WebkitTransition !== undefined ||
				bodyStyle.MozTransition !== undefined ||
				bodyStyle.msTransition !== undefined) {
				if (this._staticConfig._useCSS === true) { //_config是提供用户的选择, 但要使用的话, 需检测环境能否
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
			this._transformsEnabled = this._staticConfig._useTransform && (this._animType !== null && this._animType !== false);
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

