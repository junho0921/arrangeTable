/* 依赖: jQuery*/

/* 混合模式v2.2*/

/*
思考:
	1, 关闭按钮应该在初始化渲染item的时候用户自定义模板自己写的, 不是进入编辑模式由本组件完成的, 表象是组件控制了关闭按钮的出现与事件, 但逻辑上应该是关闭按钮初始化后就一直存在, 只是显示在事件判断出现
	2, 进入编辑模式原本有两个渠道:1,touchStart后设定时进入;2,拖拽初始化进入.这概念是保证了长按状态与拖拽状态都会进入, 但会产生重复进入, 所以设定了禁止同一个对象重复进入, 这个禁止也产生问题:第二次点击该对象不能进入编辑模式, 这也不对
		现在,只通过touchStart后设定时进入, 因为拖拽是长按才发生的, 而且长按后释放触控会执行stopEvent取消定时, 所以逻辑上更关心stopEvent的处理

 // 本组件的原本思维是先让文本append到html里, 获取items格子的文本位置, 再让items脱离文本流, 重新定位排队, 所以初始化比较耗性能
 // 这样的思路是有利于提供多尺寸的items, 但由于posAry没有相应的调整, 所以其实没有意义!
	现在的思路是先把items以绝对定位append到html里, 然后获取item的尺寸作为容器的列数和行数, 也作为posAry的参考, 这样就一次性的脱离文本流

事件操作:<br/>
	点击item --> 跳转页面<br/>
	长按item --> 进入编辑模式 --> 松开item --> 点击任何item, 退出编辑模式<br/>
	长按item --> 进入编辑模式 --> 松开item --> 点击关闭按钮, 删除编辑的item, 退出编辑模式<br/>
	长按item --> 进入编辑模式 --> 拖拽item --> 拖动到新位置, items排序, 让出位置给排序item --> 在新位置松开item --> 被拖动的item有滑动归位效果<br/>

视觉效果及技术原理:
	1, 拖拽效果  --- css || translate
	2, 排序效果  --- transition || animate
	3, press的放大效果, 发生在dragItem上, 不是reorderItem上:
		1, 暂时使用keyframes{transform:scale},
		2, 可以考虑使用font-size调整, 配合所有item尺寸是em单位
		3, 用户自定义width, height变化
		// 所以进入编辑模式就立即生成dragItem且先设transition为很短时间(这样才不至于有分歧的情况), 在拖拽前才设transition为0秒
	4, 关闭按钮的出现于消失都有动画效果
	5, 禁止指定的排位
	6, 生成dragItem能定位到触控点中心对齐!, 问hugo!
		若可以直接定位到触控点位置的话就可以使用font-size配合margin来放大

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
	1, 兼容转屏
	2, 行为事件判断简化以确保主要事件能执行? 可能这是个假设错误, 逻辑不需要简化, 需要的是正确
	3, 可以使用关闭按钮的情况是: 没有重新排序的情况就可以使用, 有重新排序的话就会隐藏关闭按钮的
	4, 尝试把addClass与removeClass放在统一逻辑方法

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

	var DraggableMenu = function ($container, options, view) {

		this.initialize($container, options, view);

		return this;
	};

	DraggableMenu.prototype = {
		initialize: function($container, options, view) {
			this._$DOM = view ? view.$el : $(document);

			// 绑定方法的上下文
			this._startEventFunc = $.proxy(this._startEventFunc, this);
			this._dragEventFn = $.proxy(this._dragEventFn, this);
			this._stopEventFunc = $.proxy(this._stopEventFunc, this);


			// 属性设置
			this._config = $.extend({}, this._defaultConfig, options);

			/*模式选择*/
			var mode = this._staticConfig._mode[this._staticConfig._modeSelect];
			for(var xx in mode.attr ){
				this._staticConfig[xx] = mode.attr[xx];
			}

			// 检测环境选择属性
			this._setProps();

			/*测试 start*/
			if(this._getOS() === "pc"){this._staticConfig._sensitive = false}
			for(var i = 0; i < this._config.dataList.length; i++){
				this._config.dataList[i].url = this._config.dataList[i].text
			}/*测试 end*/

			this._$container = $container.css({'position': 'relative', "padding":0});

			// 生成到DOM树里
			if(this._staticConfig._templateRender && this._config.dataList.length){
				this._renderItems();
			}


			// 获取尺寸数据
			this._getSize();

			// 计算静态位置数组与items的序号数组
			this._getPosAry_getIndexAry();

			// items对应位置对齐
			this._setItemsPos(this._$items);

			this._$container.on(this._startEvent,'.' + this._config.closeBtnClassName, {onlyBtn: true}, $.proxy(this._clickCloseBtnFn, this));

			// 延迟使用transition, 避免初始化的生成html所带有的动画
			setTimeout($.proxy(function(){
				this._applyTransition(this._$items, this._config.reorderDuration);
			}, this), 1);

			// 绑定点击事件
			this._$items.on(this._startEvent, this._startEventFunc);
		},

		/*
		 * 默认设置
		 * */
		_defaultConfig: {
			// 关闭按钮的className
			closeBtnClassName: "DrM-closeBtn",

			// 长按的时间间隔
			pressDuration: 300,
			// 排序效果动画的过度时间transition-duration值
			reorderDuration: 300,
			// 放大效果动画的过度时间transition-duration值
			focusDuration: 80,
			// 允许触控的边缘值, 单位px
			rangeXY: 4,

			// 渲染html的数据内容
			dataList: [],

			// 使用放大效果, 基于perspective
			usePerspective: null,

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
			_$items: null,
		/**
		 * 排序对象
		 */
			_$reorderItem: null,
		/**
		 * 拖拽对象
		 */
			_$draggingItem: null,
		/**
		 * 点击对象
		 */
			_$touchTarget:null,
		/**
		 * 编辑对象
		 */
			_$editingTarget:null,

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
		 * 容器列数行数
		 */
			_containerCols: null,
			_containerRows: null,

		/**
		 * 事件类型
		 */
			_hasTouch: null,
			_startEvent: null,
			_stopEvent: null,
			_moveEvent: null,

		/**
		 * 状态: _dragging是进入touchMove的状态, sensitive模式下可能不需要
		 */
			_dragging: false,
		/**
		 * 状态: editing编辑模式是针对长按状态里添加"添加或删除"按钮进行编辑, 逻辑是长按进入编辑状态
		 */
			_editing: false,

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
			 * touchStart时间点
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
			_cssTransitions: null,
			/*
			 * 环境是否支持transforms
			 * */
			_transformsEnabled: null,

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
			_indexAry: null,

			/*
			 * 静态位置的坐标数组
			 * */
			_posAry: null,

			/*
			 * 点击目标的原始数据
			 * */
			_$touchTargetData: null,

			/*
			 * 拖拽item有没有引发排序, 因支付宝效果所需要的状态
			 * */
			_dragToReorder: false,

			/*
			 * 固定设置, jun的开发配置
			 * */
			_staticConfig :{
				// class名称
				// 激活的item, 包括拖动的item和排序的item
				activeItemClass: "DrM-activeItem",
				// 排序的item
				reorderItemClass: "DrM-reorderItem",
				// 拖动的item
				draggingItemClass: "DrM-draggingItem",
				// 编辑中的item
				editingItemClass: "DrM-editingItem",

				_modeSelect: 'mode3',

				_mode: {
					'mode2': {
						attr: {
							_reorderTransition: true,
							_useTransform: false // _useTransform必须为false来使用css定位才可以提供用户自定义keyframes
						},
						name: 'Float-css',
						desc: '项目模式: item浮动排序的基础, 用户可自定义item的keyframes动画, 特点:1, 排序的效果有过度; 2, 指定用户自己来写keyframes '
					},
					'mode3': {
						attr: {
							_reorderTransition: true,
							_useTransform: true,
							_animation: true// 可删除的属性, 因为mode3模式应该直接使用本属性, 但要具体看修改代码时候的情况
						},
						name: 'Float-translate',
						desc: '最优动画模式: item浮动排序的基础, 用户定义item的keyframes动画的话需要在config里定义, 特点:1, 排序的效果有过度; 2, 指定用户在config来添加keyframes; 3, 动画效果有最好的效果. 模式3是最麻烦的模式, 因为使用了translate定位是影响到transform的其他属性的使用, 所以在放大效果需要scale的话就需要本组件自己设定好transform里translate值与scale同步'
					}
			},

			// 灵敏模式, 准备删除
			_sensitive: true,
				// 选择模板, 看是否能删除, 应该可以, 但不用, 因为只需要保留true值就可以, 意思是只需要用户传值渲染数据都会使用自定义模板
				_templateRender: true,
				// _useCSS的正否是选择translate3D还是translate, 当然最后会由环境来判断, 这里一直默认是true
				_useCSS: true,
				// 选择transition的动画效果属性
				_transitionTiming: "ease-in-out",
				// 点击时间间隔
				_clickDuration: 250,

				/*模式属性, 默认为模式2*/
				// _animation的正否决定是否由本组件负责生产keyframes, 默认否
				_animation: false,
				// 选择transform动画来定位, 当使用translate定位的话会影响到keyframes的自定义使用
				_useTransform: false
		},
		_renderItems: function(){
			// 填充template内容并收集所有item的html的jQuery包装集
			var data = this._config.dataList,
				len = data.length,
				$itemHtml, $itemsHtml = [];

			for(var i = 0; i < len; i++){
				$itemHtml = this._config.renderer(data[i], i, data)// 根据用户的自定义模板填进数据
					.data('DrM-dataDetail', data[i]);
				if(data[i].static){
					$itemHtml.addClass('DrM-static');
					this._staticCount++;// 记数
				}
				$itemsHtml.push($itemHtml);// ps: 假设static项写在数组的最后
			}

			// 把所有item的html的jQuery包装集渲染到容器里
			this._$container.html($itemsHtml);
		},

		_getSize: function(){
			this._$items = this._$container.children();

			// 获取子项li尺寸
			this._itemH = this._$items.outerHeight(true);
			this._itemW = this._$items.outerWidth(true);

			// 获取容器ul宽度尺寸
			this._containerW = this._$container.width();

			// 计算容器的列数和行数
			//this._containerCols = Math.floor(this._containerW / this._itemW);
			// 遍历方法来计算容器列数, 方法是计算第i个换行的,那i就是列数, 这方法的意义是按照css设计者的样式计算
			for(var i = 0; i < this._$items.length; i++){
				if(this._$items.eq(i).position().top > 1){
					this._containerCols = i;
					break;
				}
			}
			this._containerRows = Math.ceil(this._$items.length / this._containerCols);

			// 锁定容器尺寸
			this._$container.css({
				'height': this._containerH = this._containerRows * this._itemH,
				'width' : this._containerW, 'overflow' : 'hidden'
			});
			this._$items.css({position: 'absolute', left: 0, top: 0})
		},

		// 根据容器的尺寸计算出一个数组, 长度为items.length, 内容是格子左上角坐标
		_getPosAry_getIndexAry: function(){
			// 位置的静态写法
			// 数组保存:格子数量和各格子坐标, 优点: 避免重复计算
			this._posAry = [];
			// 默认基于translate3D的修改模式, 所以升级必须优化

			// 获取初始排序的数组, 以item文本位置序号为内容的数组
			this._indexAry = [];

			for(var i = 0; i < this._$items.length; i++){
				this._indexAry[i] // 视觉位置
					= i; // i是文本位置的序号

				var position = {};
				var inRow = Math.floor(i / this._containerCols);
				var inCol = i % this._containerCols;
				position.left = inCol * this._itemW;
				position.top = inRow * this._itemH;
				this._posAry.push(position);

				this._indexAry[i] // 视觉位置
					= i; // i是文本位置的序号

				/* 以下是keyframes的生成 */
				//var translateA = 'translate3D(' + position.left +'px, ' + position.top +'px, 0px)';
				//this._addKeyframes('pos' + i, {
				//	'0%,100%': {
				//		opacity: 1,
				//		'z-index': 99,
				//		'-webkit-transform': translateA + ' scale3d(1, 1, 1)',
				//		transform: translateA + ' scale3d(1, 1, 1)'
				//	},
				//	'50%': {
				//		opacity: 0.5,
				//		'z-index': 99,
				//		'-webkit-transform': translateA + ' scale3d(1.2, 1.2, 1.2)',
				//		transform: translateA + ' scale3d(1.2, 1.2, 1.2)'
				//	}
				//});
			}
		},

		_setItemsPos: function($items, index1, index2){
			// index1, index2作为选择性执行的范围
			var len, st = 0;

			if(index1 && index2 && index1 !== index2){
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
			//if($.inArray(event.target, this._$items) < 0 ){
			//	console.log('非点击拖动对象'); return
			//}

			// 拖点击对象是关闭按钮, 则不能执行本方法
			if(event.target.className == this._config.closeBtnClassName){
				console.log('点击关闭按钮'); return
			}
			this._applyTransition(this._$items);

			this._$touchTarget = $(event.currentTarget);

			this._startTime = event.timeStamp || +new Date();

			// 记录初始位置
			this._eventStartX = this._page('x', event);
			this._eventStartY = this._page('y', event);

			// 获取文本位置的序号
			this._textIndex = this._$touchTarget.addClass(this._staticConfig.activeItemClass).index();

			// 由于DOM结构固定, 所以需要在变量indexAry数组里获取DOM-index所在的视觉位置序号
			this._visualIndex = $.inArray(this._textIndex, this._indexAry);

			this._draggingItemStartPos = this._posAry[this._visualIndex];

			// 获取本DOM的原始数据
			if(this._config.dataList){
				this._$touchTargetData = this._$touchTarget.data('DrM-dataDetail');//this._config.dataList[this._visualIndex];
			}

			// 绑定事件_stopEvent, 本方法必须在绑定拖拽事件之前
			this._$DOM.one(this._stopEvent, this._stopEventFunc);

			if(!this._$touchTargetData || (this._$touchTargetData && !this._$touchTargetData.static)){
				// 设定时触发press, 因按下后到一定时间, 即使没有执行什么都会执行press和进行编辑模式
				var _this = this;
				this._setTimeFunc = setTimeout(function(){
					_this._enterEditingMode();
				}, this._config.pressDuration);

				// 绑定拖拽事件
				this._$DOM.on(this._moveEvent, this._dragEventFn);
			}

		},

		_enterEditingMode: function(){
			if(this._editing && this._reorderItemIndex !== this._visualIndex){
				this._$reorderItem.removeClass(this._staticConfig.editingItemClass);
			}

			this._editing = true;

			// 进入编辑模式, 需要更新现在的排序位置reorderItemIndex为item对象的所在位置
			this._reorderItemIndex = this._visualIndex;

			// 提供外部执行的方法
			this._config.onEditing(this._$items, this._$touchTarget);

			this._$touchTarget.addClass(this._staticConfig.reorderItemClass + " " + this._staticConfig.editingItemClass);

			this._$reorderItem = this._$touchTarget;

			/* 生成拖拽的item */
			this._$draggingItem = this._$reorderItem.clone()
				.removeClass(this._staticConfig.reorderItemClass)
				.addClass(this._staticConfig.draggingItemClass)
				.css({'z-index':'1001'})
				.appendTo(this._$container);

			// 放大效果: 先缩短transitionDuration, 在设定scale为1.2倍
			this._$draggingItem.position();// 这没实际用处, 但可以transition, 否则没有渐变效果!! 重要发现!
			this._applyTransition(this._$draggingItem, this._config.focusDuration);
			this._setPosition(this._$draggingItem, this._posAry[this._visualIndex], {scale: '1.2'});
		},

		_clickCloseBtnFn: function(e){
			//console.log('格子序号', this._reorderItemIndex);
			// 说明: 变量reorderItemIndex是当前进行编辑模式的item所在视觉位置

			// 必须要清除关闭按钮所在item的定时事件, 因为本关闭按钮方法绑定在$container上对子元素进行捕获才发生, 所以必然会先捕获关闭按钮所在item, 触发item的touchStart事件(但不会触发touchEnd事件, 因为捕获了关闭按钮就不会冒泡!), 所以这里这里必须清理item的在startEvent里的所有绑定事件包括setTimeout和touchStart和touchMove事件
			// 使用方法stopEventFunc是最好的选择, 因为可以清理startEvent带来的所有事件, 并关闭编辑模式
			this._startTime = e.timeStamp || +new Date();

			this._stopEventFunc();

			//console.log('删除item对象内容 ',
			// 删除reorderItemsAry里视觉位置的item
			this._$items.splice(this._reorderItemIndex, 1)
			//[0]);
			//console.log('删除后, 更新的对象集', this._$items);

			// 删除
			this._indexAry.splice(this._reorderItemIndex, 1);

			// 遍历更新
			for (var y = 0; y < this._indexAry.length; y++){
				var indexValue = this._indexAry[y];
				if(indexValue > this._textIndex){
					this._indexAry[y] = indexValue - 1;
				}
			}

			// 调整容器的高度为适当高度
			this._$container.height(
				Math.ceil(this._$items.length / this._containerCols) * this._itemH
			);

			// 删除本item
			this._$reorderItem.remove();

			// 提供外部执行的方法, 传参修改后的items对象集合
			this._config.onClose(this._$items);

			// 清空排序的序号, 否则长按与本_reorderItemIndex值相同的视觉位置item会没有反应
			this._reorderItemIndex = null;

			// 动画"定位"剩下的items
			this._setItemsPos(this._$items);
		},

		_stopEventFunc: function(){
			/*
			 stopEventFunc意义:
			 所有停止动作事件所执行的方法.
			 意义是清理className, 清理startEvent所绑定的事件与定时器, 选择性的退出编辑模式, 对拖拽的item负责任: 动画回归, 关闭_InitializeMoveEvent与_dragging

			 执行本停止事件方法的情况:
			 A,拖拽item后
			 B,无拖拽:
			 a, 点击: (点击item与点击关闭按钮)
			 a1: 编辑状态的点击, 退出
			 a2: 非编辑状态的点击, 执行正常点击事件
			 b, 长按后释放触控: 继续保持编辑模式, 但动画回归dragItem后移除dragItem
			 */

			// 判断维度:
			//

			var _this = this,
				removeClassName = this._staticConfig.activeItemClass + " " + this._staticConfig.reorderItemClass;

			clearTimeout(this._setTimeFunc);
			console.log('stopEventFunc');
			this._$DOM.off(this._moveEvent + " " + this._stopEvent);

			// 停止事件都要移除activeItemClass与reorderItemClass, 但editingItemClass是伴随编辑模式的

			if(this._InitializeMoveEvent){
				// 先去掉draggingItemClass, 脱离拖拽状态
				this._$draggingItem.removeClass(this._staticConfig.draggingItemClass)//.addClass('DrM-reItem');

				// 状态: 拖拽了item的释放触控
				this._applyTransition(this._$draggingItem);

				this._setPosition(this._$draggingItem, {
					'left': this._posAry[this._reorderItemIndex].left,
					'top': this._posAry[this._reorderItemIndex].top
				});

				if(this._dragToReorder){
					// 状态: 拖拽item并产生重新排序items的释放触控
					// 按支付宝效果, 若拖拽产生位移的话, 退出编辑模式
					removeClassName += (" " + this._staticConfig.editingItemClass);
					this._editing = false;
					this._dragToReorder = false;
				}
				// 动画效果后的callback
				setTimeout(function(){
					_this._$draggingItem.remove();

					// 在动画后才移除className, 动画中需保持样式
					_this._$reorderItem.removeClass(removeClassName)//.css('opacity', 1);

					// 提供外部的方法, 传参排序后的jQuery对象集合
					_this._config.onDragEnd(_this._$items);

				}, this._config.reorderDuration);

			}else{
				this._$container.children().removeClass(removeClassName);

				if(this._dragging === false){
					// 状态: 没有拖拽且没有滑动触控点
					var stopTime = new Date();

					if(stopTime - this._startTime < this._staticConfig._clickDuration){ // 判断: 没有拖拽后且没有滑动且只在限制时间内才是click事件
						// 状态: 没有拖拽的点击
						if(this._editing){
							// 状态: 在编辑模式中, 没有拖拽的点击
							// 编辑模式的情况下的点击事件是结束编辑或取消编辑的点击:
							this._$items.removeClass(this._staticConfig.editingItemClass);

							this._editing = false;
						} else{
							// 状态: 非编辑模式且没有拖拽的点击, 是正常的点击
							this._config.onItemTap(this._$touchTargetData);
						}
					} else {
						// 状态: 长按而没有拖拽的释放触控, 认为是进入了编辑模式的释放触控
						//动画
						this._setPosition(this._$draggingItem, {
							'left': this._draggingItemStartPos.left,
							'top': this._draggingItemStartPos.top
						});
						//动画事件后的callback删除draggingItem
						_this._$draggingItem.animate({opacity:0},_this._config.focusDuration,function(){
							_this._$draggingItem.remove();
						});
					}
				} else {
					if(this._editing){
						// 状态: 长按而没有拖拽的释放触控, 认为是进入了编辑模式的释放触控
						//动画
						this._setPosition(this._$draggingItem, {
							'left': this._draggingItemStartPos.left,
							'top': this._draggingItemStartPos.top
						});
						//动画事件后的callback删除draggingItem
						_this._$draggingItem.animate({opacity:0},_this._config.focusDuration,function(){
							_this._$draggingItem.remove();
						});
					}
				}
			}

			this._InitializeMoveEvent = false;
			this._dragging = false;
		},

		_dragEventFn: function(event){
			this._dragging = true;// 进入拖动模式

			var Move_ex = this._page('x', event),
				Move_ey = this._page('y', event);

			// 初始化MoveEvent
			if(!this._InitializeMoveEvent){
				// 条件1: 限时内
				var inShort = (event.timeStamp - this._startTime) < this._config.pressDuration;
				if(this._staticConfig._sensitive){
					// 灵敏模式, 只关心满足时间条件就可以拖拽
					if (inShort){
						this._stopEventFunc();
						return;
					}
				} else {
					// move过程中对事件的判断有两个重要变量: 延时与范围
					// 都满足: 按住拉动
					// 都不满足: swipe
					// 满足2, 不满足1: 是触控微动, 不停止, 只是忽略
					// 满足1, 不满足2: 是错位, 可以理解是双触点, 按住了一点, 满足时间后立即同时点下第二点
					// 在app实际运行时, 触控滑动监听的_moveEvent事件比较灵敏, 即使是快速touchMove, 也计算出触控点位置仅仅移动了1px, 也就是Move_ey - this._eventStartY = 1px, 所以这里在未满足时间情况完全不考虑触控点移动而直接停止方法return出来
					console.log('pc模式判断事件');
					var rangeXY = this._config.rangeXY;
					var outRang = (Move_ex - this._eventStartX ) > rangeXY || (Move_ey - this._eventStartY) > rangeXY;

					if (inShort){
						// 非灵敏模式, 区分触控点变化范围
						console.log(Math.abs(Move_ex - this._eventStartX), Math.abs(Move_ey - this._eventStartY));
						if(Math.abs(Move_ex - this._eventStartX) > rangeXY || Math.abs(Move_ey - this._eventStartY) > rangeXY){
							console.log('非拖拽的swipe');
							this._stopEventFunc();
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
						this._stopEventFunc();
						return false;
					}
				}

				// 满足两个条件后, 初始化(仅进行一次)
				this._InitializeMoveEvent = true;
				// 重新获取可以拖拉的数量
				this._draggableCount = this._$items.length - this._staticCount;

				// 进入拖拽状态前必须先清空reorderItem的transition, 因为需要reorderItem立即变化为透明与在释放dragItem动画后立即显示reorderItem
				this._disableTransition(this._$reorderItem);

				// 清空transition来实现无延迟拖拽
				this._disableTransition(this._$draggingItem);
			}

			// 在初始化拖动后才禁止默认事件行为
			event.preventDefault();

			var cssX, cssY;
			// 计算触控点拖拽距离
			cssX = Move_ex - this._eventStartX;
			cssY = Move_ey - this._eventStartY;

			// 计算item被拖拽时的坐标
			cssX = this._draggingItemStartPos.left + cssX;
			cssY = this._draggingItemStartPos.top + cssY;

			// 拖拽
			this._setPosition(this._$draggingItem, {'left': cssX, 'top': cssY}, {scale: '1.2'});

			// 重新排序
			this._reorder(cssX, cssY);
		},

		_getTouchIndex: function(touchX, touchY){
			// 不能超出容器范围
			if(touchX > 0 && touchX <= this._containerW && touchY > 0 && touchY <= this._containerH){
				var curCol = Math.floor(touchX / this._itemW) + 1;// 列数
				var curRow = Math.floor(touchY / this._itemH);// 行数
				return (curRow * this._containerCols + curCol - 1);// 计算值 = (坐标行数-1)*容器列数 + 坐标列数 -1;
			}
		},

		_reorder: function(cssX, cssY) {
			/* 思路1: 监听触控点位置来插入空白格子 */
			// 1, 计算触控点位置
			// 2, 计算target的文档位置
			// 3, 以1与2的相对位置, 整除_itemW和_itemH得出触控点所在的li的序号index, 以此作为插入的位置
			// 但Bug!!! 缩放屏幕会出现偏差. 根本原因是步骤1与2的获取位置的原理不同, 缩放时各自变化比例不同, 所以不能同时使用思路1

			/* 思路2: 监听拖动项的中心位置来插入空白格子 */
			// 1, 计算拖拽时target中心位置的坐标targetCenterPos
			var targetCenterPosX = cssX + this._itemW / 2,
				targetCenterPosY = cssY + this._itemH / 2;

			// 2, 以targetCenterPos坐标来计算触控点所在视觉位置visionIndex
			var visionIndex = this._getTouchIndex(targetCenterPosX, targetCenterPosY) || 0;

			// 3, 选择性的进行排序
			// 基于绝对定位, 不用考虑文本流的插入index值的调整
			if(
				visionIndex !== this._reorderItemIndex && // 在同一item上的拖拽不执行重新排序
				visionIndex >= 0 && visionIndex < this._draggableCount // 超过items数量范围的拖拽不执行重新排序
			){
				this._dragToReorder = true;
				// 重新排序数组
				this._reorderFn(this._$items, this._reorderItemIndex, visionIndex);
				this._reorderFn(this._indexAry, this._reorderItemIndex, visionIndex);

				// 重新排序items位置, 只对有视觉上需要位移的items进行排序
				this._setItemsPos(this._$items, this._reorderItemIndex, visionIndex);

				// 更新本次位置
				this._reorderItemIndex = visionIndex;
			}
			// 对比思路1, 由于拖拽距离是稳定的, 判断插入的位置只是基于文档位置的获取机制, 所以可以.
		},

		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------  以下方法可另作组件公用  -----------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/

		_applyTransition: function($obj, duration) {
			// 添加css  Transition
			var transition = {};

			// 默认过渡时间是排序过渡时间
			duration = duration || this._config.reorderDuration;

			transition[this._transitionType] = 'all ' + duration + 'ms ' + this._staticConfig._transitionTiming;
			//transition[this._transitionType] = this._transformType + ' ' + this._config.reorderDuration + 'ms ' + this._staticConfig._transitionTiming;

			$obj.css(transition);
		},

		_applyAnimation: function($obj, index) {
			// 添加css  Transition
			var animation = {};

			animation[this._animationType] = 'pos' + index + " 0.3s";

			$obj.css(animation);
		},

		_disableAnimation: function($obj) {
			// 去掉css  Transition
			var animation = {};

			animation[this._animationType] = "";

			$obj.css(animation);
		},

		_createKeyframes: function(){
			// 在不转屏的情况, 可直接生成keyframes动画, 直接填坑就好了

		},

		_disableTransition: function($obj) {
			// 去掉css  Transition
			var transition = {};

			transition[this._transitionType] = 'all 0s';
			//transition[this._transitionType] = '';

			$obj.css(transition);
		},

		_setProps: function() {
			// 环境检测可用的css属性: 能否使用transition, 能否使用transform

			var bodyStyle = document.body.style;

			// 选择事件类型, 添加命名空间, 不会与其他插件冲突
			this._hasTouch = 'ontouchstart' in window;
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
				this._animationType = '-o-animation';
				if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) this._animType = false;
			}
			if (bodyStyle.MozTransform !== undefined) {
				this._animType = 'MozTransform';
				this._transformType = '-moz-transform';
				this._transitionType = 'MozTransition';
				this._animationType = '-moz-animation';
				if (bodyStyle.perspectiveProperty === undefined && bodyStyle.MozPerspective === undefined) this._animType = false;
			}
			if (bodyStyle.webkitTransform !== undefined) {
				this._animType = 'webkitTransform';
				this._transformType = '-webkit-transform';
				this._transitionType = 'webkitTransition';
				this._animationType = '-webkit-animation';
				if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) this._animType = false;
			}
			if (bodyStyle.msTransform !== undefined) {
				this._animType = 'msTransform';
				this._transformType = '-ms-transform';
				this._transitionType = 'msTransition';
				this._animationType = '-ms-animation';
				if (bodyStyle.msTransform === undefined) this._animType = false;
			}
			if (bodyStyle.transform !== undefined && this._animType !== false) {
				this._animType = 'transform';
				this._transformType = 'transform';
				this._transitionType = 'transition';
				this._animationType = 'animation';
			}
			this._transformsEnabled = this._staticConfig._useTransform && (this._animType !== null && this._animType !== false);
			//this._transformsEnabled = false;// 测试用
			//this._cssTransitions = false;// 测试用
		},

		_setPosition: function($obj, position, option) {
			// 方法setCSS: 即时位置调整
			// 之后扩展可以参考scale来做
			option = option || {};
			var positionProps = {},
				x, y,
				scale = option.scale || '1';

			x =  Math.ceil(position.left) + 'px';
			y =  Math.ceil(position.top) + 'px';

			if (this._transformsEnabled === false) {
				positionProps = {'left': x, "top": y};
				//scale = "scale(" + scale + ', ' + scale + ")";
				//positionProps[this._animType] = scale;
			} else {
				// 配置scale, 提供用户使用放大效果
				if (this._cssTransitions === false) {
					scale = "scale(" + scale + ', ' + scale + ")";
					positionProps[this._animType] = 'translate(' + x + ', ' + y + ') ' + scale;
				} else {
					scale = "scale3d(" + scale + ', ' + scale + ', ' + scale + ")";
					positionProps[this._animType] = 'translate3d(' + x + ', ' + y + ', 0px) ' + scale;
				}
			}
			//console.log('positionProps', positionProps);
			$obj.css(positionProps);
		},

		_animateSlide: function($obj, position, callback) {
			// 方法animateSlide: 位置调整的动画滑动效果, 且接收callback
			var animProps = {}, DrM = this;

			if (this._transformsEnabled === false) {
				// 降级方案 使用animate方案
				$obj.animate(position, this._config.reorderDuration, 'swing', callback);
				//this._applyTransition($obj);
				//$obj.css({'left': position.left + 'px', 'top': position.top + 'px'})
				//setTimeout(function(){
				//	callback()
				//}, this._config.reorderDuration);
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
							duration: this._config.reorderDuration,
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
						}, this._config.reorderDuration);
					}
				}

			}

		},

		_addKeyframes: function(name, frames){
			// 参数name, frames是必须的

			// 生成style标签
			var styleTag = document.createElement('style');
			styleTag.rel = 'stylesheet';
			styleTag.type = 'text/css';
			// 插入到head里
			document.getElementsByTagName('head')[0].appendChild(styleTag);

			var styles = styleTag.sheet;

			// 生成name命名的keyframes
			try {
				var idx = styles.insertRule('@keyframes ' + name + '{}',
					styles.cssRules.length);
			}
			catch(e) {
				if(e.name == 'SYNTAX_ERR' || e.name == 'SyntaxError') {
					idx = styles.insertRule('@-webkit-keyframes ' + name + '{}',
						styles.cssRules.length);
				}
				else {
					throw e;
				}
			}

			var original = styles.cssRules[idx];

			// 遍历参数2frames对象里的属性, 来添加到keyframes里
			for(var text in frames) {
				var  css = frames[text];

				var cssRule = text + " {";

				for(var k in css) {
					cssRule += k + ':' + css[k] + ';';
				}
				cssRule += "}";
				if('appendRule' in original) {
					original.appendRule(cssRule);
				}
				else {
					original.insertRule(cssRule);
				}
			}
		},

		// 方法: 获取触控点坐标
		_page :  function (coord, event) {
			return (this._hasTouch? event.originalEvent.touches[0]: event)['page' + coord.toUpperCase()];
		},

		_getOS: function browserRedirect() {
			var sUserAgent = navigator.userAgent.toLowerCase();
			var bIsIpad = sUserAgent.match(/ipad/i) == "ipad";
			var bIsIphoneOs = sUserAgent.match(/iphone os/i) == "iphone os";
			var bIsMidp = sUserAgent.match(/midp/i) == "midp";
			var bIsUc7 = sUserAgent.match(/rv:1.2.3.4/i) == "rv:1.2.3.4";
			var bIsUc = sUserAgent.match(/ucweb/i) == "ucweb";
			var bIsAndroid = sUserAgent.match(/android/i) == "android";
			var bIsCE = sUserAgent.match(/windows ce/i) == "windows ce";
			var bIsWM = sUserAgent.match(/windows mobile/i) == "windows mobile";
			if (bIsIpad || bIsIphoneOs || bIsMidp || bIsUc7 || bIsUc || bIsAndroid || bIsCE || bIsWM) {
				return "phone";
			} else {
				return "pc";
			}
		}
	};

	return (typeof define !== 'undefined') ? DraggableMenu : (window.DraggableMenu = DraggableMenu);

}));

