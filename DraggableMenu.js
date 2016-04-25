/* 依赖: jQuery, cssProp(by jun)*/

/* 混合模式v3.0*/

/*
 思考:
 1, 关闭按钮应该在初始化渲染item的时候用户自定义模板自己写的, 不是进入编辑模式由本组件完成的, 表象是组件控制了关闭按钮的出现与事件, 但逻辑上应该是关闭按钮初始化后就一直存在, 只是显示在事件判断出现
 2, 进入编辑模式原本有两个渠道:1,touchStart后设定时进入;2,拖拽初始化进入.这概念是保证了长按状态与拖拽状态都会进入, 但会产生重复进入, 所以设定了禁止同一个对象重复进入, 这个禁止也产生问题:第二次点击该对象不能进入编辑模式, 这也不对
 现在,只通过touchStart后设定时进入, 因为拖拽是长按才发生的, 而且长按后释放触控会执行stopEvent取消定时, 所以逻辑上更关心stopEvent的处理
 3, 更好的去解耦方法, 原本stopEvent是很累赘的方法, 因为包含很多逻辑, 这样需要把里面的逻辑与方法解耦出来, 分开了_enterEditMode/_quitEditMode与_removeDragItem/_renderDragItem

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


 心得:
 1, 多重兼容模式对于缺乏经验来说是挑战, 可能混乱了视线, 所以建议先做最优性能的, 最后才兼容
 2, 多缓存变量(原型变量), 多是不合理的
 3, 以触控点的文档坐标减去container的文档坐标, 来获取触控点相对于container的坐标是不准确的, 错误情况:缩放屏幕, 原因: 触控点与container的文档坐标获取原理不同??
 4, 设计过程, 分获取数据与渲染画面, 触发事件
 思考空间:
 uiTarget的缓存是保存currentGridIndex还是currentGridPos, 考虑到reorder只关心currentGridIndex与floatGridIndex, 但得益于gridPosAry, 可以以pos直接获取index, 或以index直接获取pos

 改进空间:
 1, 兼容转屏
 2, 行为事件判断简化以确保主要事件能执行? 可能这是个假设错误, 逻辑不需要简化, 需要的是正确


 4, 使用插件cssProp, 去掉_setProps
 4-2, 精炼transition
 5, 缩减模式, 因为用户没有必要顾及那么多
 6, 缩减变量
 7, 初始化的_applyTransition有问题
 8, 把defaultConfig里的配置都尽量搬到staticConfig
 9, this._gridPosAry修改为数组形式 //okay!
 10, 以cssProp方法取代本组件原方法_applyTransition/ _disableTransition/ _setPosition/ _setProps/ _page //okay!
 11, 最后除去手机检测, 没必要
 12, 重命名: freeOrderTable, arrangeTable, 理解是办公者自由安排的桌面 //okay!
 13, 本组件是改变了用户的文本流为绝对定位, 所以, 初始化显得很笨拙, 尝试保留文本流!
 14, 合并变量 //okay!
 15, 不需要再使用textIndex来计算visualIndex了, 也不需要indexAry了 //??
 16, 使用transitionEnd来处理cssHandler的动画效果, 避开setTimeout  //okay!
 17, 设计错误! : dragItem就是原item, 不用复制处理, ghostItem才是复制出来的  //okay!
 17, 不使用ghostItem! 我想不出有何意义
 18, 分离_$items作为一个方法集合! //okay!
 19, reorderItem这身份没必要, reorderIndex也是多余的 //okay!
 20, 统一touchItem, dragItem为$target //okay!
 21, 研究status应用: 没有需要保留的状态, 使用$editingItem的有无表示isEditing //okay!
 22, uiTargetStartPos, uiTargetCurrentIndex修改,合并到_$uiTarget属性里 //okay!
 23, 修改_collectUiData的不合理数据, 纯粹的要ui操作数据 //okay!
 24, //todo _$uiTarget不安全, 现在只能是一个页面只有一个实例对象

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

	// 引用cssProp插件:
	var gadget = $.fn.gadget, timeFunc;

	var arrangeTable = function ($container, options, view) {

		this.initialize($container, options, view);

		return this;
	};

	arrangeTable.prototype = {
		initialize: function($container, options, view) {
			this._$DOM = view ? view.$el : $(document);
			this._$container = $container.css({position: 'relative', padding: 0, overflow: 'hidden'});
			this._config = $.extend({}, this._defaultConfig, options, this._staticConfig);

			// 获取当前页面信息
			this._getTableDomSize();

			// 渲染items
			this._$items = new uiItems(this._renderContent(this._config.dataList), this._config, this._domSize, this._$container);
			this._$uiTarget = new uiTarget(this._$items, this._config);

			this._showContent(this._$items.$el);

			console.log('this._$items.$el', this._$items.$el);

			this._$items.$el
				// 绑定关闭按钮事件
				.onUiStart('.' + this._config.class.closeBtn, $.proxy(this._clickCloseBtnFn, this))
				// 绑定touchStart事件
				.onUiStart($.proxy(this._uiStartHandler, this));
		},

		/*
		 * 默认设置
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
		_$items: null,
		/**
		 * 操作对象
		 */
		_$uiTarget: null,
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
		/*=========================================初始化功夫============================================*/

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

		/*=======================================设计模式==============================================*/

		_collectUiData: function(dataObj){
			/*逻辑数据的收集, 与效果无关的用户操作数据, */
			for(var attr in dataObj){
				this['_' + attr] = dataObj[attr]
			}
		},

		_triggerApi: function (method, params){
			this._config[method].apply(this, params);
		},
		/*=======================================事件发展==============================================*/

		_uiStartHandler :function(event){
			var $e = $(event.currentTarget), touchTime = event.timeStamp || +new Date(), _this = this;
			var isTargetStatic = $e.hasClass(this._config.class.staticItem);
			var isReTouchTooFast = touchTime - this._stopTime < this._config.reorderDuration;

			if(isReTouchTooFast){return}// 看来操作的条件没有状态判断

			this._$uiTarget.start($e);

			this._collectUiData({
				//eventData	:{
					startTime		: touchTime,
					eventStartPos	: gadget.getTouchPos(event)
			});
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
			if(this._$editingItem && (!this._$uiTarget.$el.is(this._$editingItem))){
				this._$editingItem.removeClass(this._config.class.editItem);
			}

			this._triggerApi('onEditing', [this._$items.$el, this._$uiTarget.$el]);

			var $uiTarget =  this._$uiTarget.toBeDragItem();
			this._collectUiData({
				//eventTarget	: {
				    $editingItem: $uiTarget.addClass(this._config.class.editItem)
			});
		},

		_uiProcessInit: function(event){
			event.preventDefault();
			// todo this._sensitiveJudge(event)
			var isFlag = (event.timeStamp - this._startTime) < this._config.pressDuration;
			if (isFlag){ console.log('isFlag');
				this._cleanEvent();
				this._$uiTarget.end();
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

			this._$uiTarget.followMove(movePos);//可以raf

			var floatGridIndex = this._$uiTarget.getFloatGrid(movePos);//可以raf
			var floatGridPos = this._$items.getGridPos(floatGridIndex);

			if(floatGridPos !== this._$uiTarget.currentGridPos){
				var currentGridIndex = this._$items.getVisualIndex(this._$uiTarget.currentGridPos);
				this._$items.reorder(currentGridIndex, floatGridIndex);

				this._$uiTarget.currentGridPos = floatGridPos;
			}
		},

		_uiStopHandler: function(event){
			this._collectUiData({
				//eventData:{
					stopTime: event.timeStamp
			});

			this._cleanEvent();

			var purpose = this._judgeUserAction(); console.log('purpose = ', purpose);

			purpose && this._uiCallback[purpose].apply(this);

			this._$uiTarget.end();
		},

		_judgeUserAction: function(){
			var isPress = (this._stopTime - this._startTime) > this._config.pressDuration;
			if(isPress && this._$editingItem){
				var isDragToReorder = this._$uiTarget.currentGridPos !== this._$uiTarget.startGridPos;
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

					this._triggerApi('onDragEnd', [this._$items.$el]);
				}, this);
				this._$uiTarget.reset(callback);
			},
			forEnterEdit: function(){
				this._$uiTarget.reset();
			},
			forTap: function(){
				var itemData = this._$uiTarget.$el.data('DrM-dataDetail');
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

			this._collectUiData({
				//eventTarget	:{
					$editingItem: null
			});
		},

		_clickCloseBtnFn: function(e){
			var targetIndex = this._$items.getVisualIndex($(e.delegateTarget));

			this._$items.delete(targetIndex);

			this._quitEditMode();

			this._triggerApi('onClose', [this._$items.$el]);

			this._collectUiData({
				//eventData:{
					stopTime: event.timeStamp
			});
		},

		_cleanEvent: function(){
			// 清空绑定事件与定时器, 清空由startEvent于moveEvent放生的状态与事件

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


	function uiItems () {
		console.log(this);
		return this.init.apply(this, arguments);
	}
	uiItems.prototype = {
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
			if($.type(index) == 'number'){
				return this.gridPosAry[index];
			} else {
				return index.data('pos');
			}
		},
		getVisualIndex: function(param){
			/*以点击的对象所在的格子pos来判断在视觉上的位置*/
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
			var _$items = this;
			var startIndex = (arrange && arrange[0]) || 0;// startIndex的意义是拖拽排序时, 只有连续items需要排序
			var $target = arrange ? (this.$el.slice(arrange[0], arrange[1])) : this.$el;
			$target.each(function(i, item){
				var $e = $(item);
				var pos = _$items.getGridPos(i + startIndex);
				$e.transform({pos: pos, scale: [1, 1, 1]});
				_$items.saveGridPosCache($e, pos);
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
			var max = this.domSize.gridsLength;
			//var max = this.domSize.gridsLength - this.context._staticCount;
			floatIndex = floatIndex < max ? (floatIndex >= 0 ? floatIndex : 0) : max;
			return floatIndex;// 计算值 = (坐标行数-1)*容器列数 + 坐标列数 -1;
		}
	};

	function uiTarget () {
		return this.init.apply(this, arguments);
	}
	uiTarget.prototype = {
		/*为何要独立dragItem, 因为这里关注的是动画效果, 不是逻辑, 放大, 拖拽, 缩小并归位都是动画*/
		$el: null,
		$ghost: null,
		startGridPos: null,
		currentGridPos: null,
		items:null,
		config:null,
		init:function($items, config){
			this.$items = $items;
			this.config = config;
			return this;
		},
		start: function($e){
			this.currentGridPos = this.startGridPos = this.$items.getGridPos($e);
			this.$el = $e.addClass(this.config.class.touchItem);
		},
		toBeDragItem:function(){
			this.$el.addClass(this.config.class.dragItem);
			this.magnify();
			return this.$el;
		},
		end:function(){
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
			this.$items.saveGridPosCache(this.$el, this.currentGridPos);// 存储位置
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
			return this.$items.getIndexByPointPos(pos);
		}
	};

	return (typeof define !== 'undefined') ? arrangeTable : (window.arrangeTable = arrangeTable);
}));

