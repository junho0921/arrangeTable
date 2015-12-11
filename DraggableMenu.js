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
// $.proxy(func, this);


// 项目组版本
// 阉割html的生成方法, 减少开发接口, 只开放结束编辑
// 改名称DraggableMenu, 更改_为this
// 点击跳转怎么处理, 由项目组生产html且绑定绑定事件来跳转

// 升级
// 排序的动画效果

// 说明
// displaynone

// 测试不同css动画情况, 重点在于css定位的模式

/**
 * @class Combox
 * @memberof Nuui
 * @classdesc 利用input创建的下拉框组件<br/>
 * 		基本元素item:<br/>
 * 		item内至少有2个属性:key和text,text用于展示,key为真正的值</br>
 * 		可以设置更多的值,并可以在selectHandler和itemFilter中访问到</br>
 * 		如</br>
 * 		item={key:"USD", text:"美元"}</br>
 * 		item={key:"6225123412341234", text:"6225****1234", name:"我的账户"}</br>
 * 		Combox文档中提到的item均是这个形式
 * @param {$} input - input的$形式
 * @param {object} config - 配置
 * @param {boolean} config.readOnly - 渲染之后是否readOnly,默认为true<br/>
 * @param {int} config.maxHeight - 展开之后的最大高度,最好为一个元素高度的整数倍<br/>
 * @param {int} config.minHeight - 展开之后的最小高度,最好为一个元素的高度<br/>
 * @param {array} config.data - item数组<br/>
 * @param {func} config.selectHandler(item) - 选中一个元素后触发的事件<br/>
 * @param {func} config.itemFilter(item) - 过滤原数据使用的方法,只有返回值为true的item才会展示
 * @param {view} view - 当前的view,一定要填
 * @example var accountCombox = new Combox(view.$("#payAccount"), {
	 * 	data:[
	 * 		{key:"6225882121047658", text:"6225****7658(张三)", name:"张三", balance:"1000000"},
	 * 		{key:"6225882121042536", text:"6225****2536(李四)", name:"李四", balance:"2000000"},
	 * 		{key:"6225882121049826", text:"6225****9826(王五)", name:"王五", balance:"3000000"},
	 * 		{key:"6225882121046437", text:"6225****6437(赵茄子)", name:"赵茄子", balance:"4000000"}
	 * 	],
	 * 	itemFilter:function(item){
	 * 		return item.key.endsWith("6");
	 * 	},
	 * 	selectHandler:function(item){
	 * 		view.$("#currentBalance").html(Nuui.utils.toCashWithComma(item.balance));
	 * 	}
	 * }, view);
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

	var hasTouch = 'ontouchstart' in window ;

	// 方法: 获取触控点坐标
	var page = function (coord, event) {
		return (hasTouch? event.originalEvent.touches[0]: event)['page' + coord.toUpperCase()];
	};

	var DraggableMenu;

	DraggableMenu = function (options) {
		// 默认选项
		var defalutOptions = {
			// 子容器属性
			container:".DraggableMenu",
			activeItemClass:"DrM-activeItem",
			reorderItemClass:"DrM-reorderItem",
			draggingItemClass:"DrM-DraggingItem",

			// 或添加关闭按钮:
			closebtnthml:"<span class='DrM-CloseBtn'>-</span>",

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
				);
			},
			onItemTap:null,
			onDragEnd:null,
			onClose:null,
			onEditing:null
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
			MEMOreorderIndex: null, // 记录moveEvent的位置
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
			transitionType: null,
			transformType: null,
			animType: null,
			// 灵敏模式
			sensitive: true,
			// 不可拖动的数量
			undraggableCount: 0,
			draggableCount: 0
		};

		$.extend(this, initialSettings);

		this.options = $.extend({}, defalutOptions, options);

		this.$container = $(this.options.container).css('position','relative');

		this.initailize();

		return this;
	};

	DraggableMenu.prototype = {

		initailize: function() {

			if(this.options.templateRender && this.options.dataList.length){
				this.render();
			}

			this.$items = this.$container.children();

			this.size();

			this.setProps();

			this.initailizeEvent();
		},

		render: function(){
			// 先清空html
			this.template = [];
			// 填充template内容并收集所有item的html的jQuery包装集
			this.templatefn();
			// 把所有item的html的jQuery包装集渲染到容器里
			this.$container.html(this.template);
		},

		templatefn: function(){
			var data = this.options.dataList,
				len = data.length,
				$liHtml;

			for(var i = 0; i < len; i++){
				$liHtml = this.options.renderer(data[i], i, data)// 根据用户的自定义模板填进数据
					.data('DraggableMenuData', data[i]);// 对模板包装jQuery对象并添加数据
				this.template.push($liHtml);// ps: 假设undraggable项写在数组的最后
				if(data[i].undraggable){// 记数
					this.undraggableCount++;
				}
			}
		},

		initailizeEvent: function() {

			var DrM = this;

			this.$items.on(DrM.startEvent, function(event){
				// 禁止多点触控
				var fingerCount = event.originalEvent && event.originalEvent.touches !== undefined ?
					event.originalEvent.touches.length: 1;
				if(fingerCount > 1){return;}

				DrM.$touchTarget = $(this);
				//if(event.currentTarget.className.indexOf(DrM.ItemClassName > -1)){
				//	DrM.$touchTarget =  $(event.currentTarget);
				//}else {
				//	console.log('非点击拖动对象'); return
				//}
				//DrM.fireEvent("touchStart", [DrM.$container]);

				DrM.MEMOreorderIndex = DrM.startTargetIndex = DrM.$touchTarget.addClass(DrM.options.activeItemClass).index();

				DrM.startTime = event.timeStamp || +new Date();

				// 记录初始位置
				DrM.eventStartX = page('x', event);
				DrM.eventStartY = page('y', event);

				DrM.itemStartPagePos = $(this).offset();
				DrM.itemStartPos = $(this).position();

				// 计算target中心的初始位置targetCenterStart
				DrM.targetCenterStartX = DrM.itemStartPos.left + DrM.liW/2;
				DrM.targetCenterStartY = DrM.itemStartPos.top + DrM.liH/2;

				// 绑定事件stopEvent, 本方法必须在绑定拖拽事件之前
				$('body').one(DrM.stopEvent, function(){
					DrM.stopEventFunc();
				});

				if($(this).data('DraggableMenuData').undraggable){return}

				// 设定时触发press, 因按下后到一定时间, 即使没有执行什么都会执行press和进行编辑模式
				DrM.setTimeFunc = setTimeout(function(){

					DrM.enterEditingMode();

					// 以timeDuration为间隔触发press事件
					//DrM.fireEvent("press",[DrM.$Target]);
				}, DrM.options.timeDuration);

				// 绑定拖拽事件
				DrM.drag();
			});
		},

		enterEditingMode: function(){
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

			this.options.onEditing();

			this.$Target = this.$touchTarget
				.append(
				$(this.options.closebtnthml).css(this.options.btncss).on(this.startEvent, function(){
					DrM.$Target.remove();
					DrM.options.onClose();
				})
			);
		},

		stopEventFunc: function(){
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
				this.$container.children().removeClass(this.options.activeItemClass + " " +this.options.reorderItemClass);

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
		},

		dragItemReset: function(){
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
					this.$container.find("."+ this.options.activeItemClass).position().left // 需要重新获取元素,不能直接$dragTarget.position(). 因为这样得出的时$dragTarget基于位移之前的坐标, 而不是基于父级的坐标
					- this.dragItemOriginalpos.left;
				resetY = this.$container.find("."+ this.options.activeItemClass).position().top - this.dragItemOriginalpos.top;
			}

			// 执行滑动效果
			var DrM = this;
			this.animateSlide({'left': resetX, 'top': resetY}, function(){
				DrM.$container.find('.' + DrM.options.draggingItemClass).remove();
				DrM.options.onDragEnd();
				DrM.$container.children().removeClass(DrM.options.activeItemClass + " " + DrM.options.reorderItemClass);
				//DrM.fireEvent("afterDrag", [DrM.$Target]);
			});
		},

		drag: function(){
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

					// 条件2: 范围外  ps:建议范围RangeXY不要太大, 否则变成了定时拖动.
					var RangeXY = DrM.options.RangeXY;

					if(DrM.sensitive){
						RangeXY = RangeXY * 3;
					}
					var outRang = (Move_ex - DrM.eventStartX ) > RangeXY ||
						(Move_ey - DrM.eventStartY) > RangeXY;

					if(outRang){
						console.warn('按住达到一定时间后瞬间move超距离, 认为是操作失误');
						DrM.stopEventFunc();
						return false;
					}else{
						// 满足两个条件后, 初始化(仅进行一次)

						// 需要重新获取$items, 否则this.$items仅仅指向旧有的集合, 不是新排序或调整的集合

						DrM.enterEditingMode();

						DrM.$items = DrM.$container.children();

						// 重新获取可以拖拉的数量
						DrM.draggableCount = DrM.$items.length - DrM.undraggableCount;

						// 复制目标作为拖拽目标
						DrM.$dragItem =
							DrM.$Target.clone()
								.addClass(DrM.options.draggingItemClass)
								.appendTo(DrM.$container);// Bug: 改变了$container的高度! 但可通过css固定高度

						DrM.dragItemOriginalpos = DrM.$dragItem.position();
						// $dragTarget的坐标
						dragItemStartX = DrM.dragItemStartX = DrM.itemStartPos.left - DrM.$dragItem.position().left;
						dragItemStartY = DrM.dragItemStartY = DrM.itemStartPos.top - DrM.$dragItem.position().top;

						// $dragItem的坐标调整等于$dragTarget的坐标
						DrM.$dragItem.css({'position':'relative','left': dragItemStartX,'top': dragItemStartY});

						//DrM.fireEvent("beforeDrag", [DrM.$dragItem]);

						DrM.InitializeMoveEvent = true;

						DrM.$Target.addClass(DrM.options.reorderItemClass);
					}
				}

				// 在初始化拖动后才禁止默认事件行为
				event.preventDefault();

				// 计算触控点移动距离
				var cssX = Move_ex - DrM.eventStartX,
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
			});
		},

		reorder: function(cssX, cssY) {
			/* 思路1: 监听触控点位置来插入空白格子 */
			// 1, 计算触控点位置
			// 2, 计算target的文档位置
			// 3, 以1与2的相对位置, 整除liW和liH得出触控点所在的li的序号index, 以此作为插入的位置
			// 但Bug!!! 缩放屏幕会出现偏差. 根本原因是步骤1与2的获取位置的原理不同, 缩放时各自变化比例不同, 所以不能同时使用思路1

			/* 思路2: 监听拖动项的中心位置来插入空白格子 */
			// 1, 计算target中心的初始位置targetCenterStart, 直接获取this.targetCenterStartX,this.targetCenterStartY
			// 2, 计算拖拽时target中心位置的坐标targetCenterPos

			var targetCenterPosX = this.targetCenterStartX + cssX;
			var targetCenterPosY = this.targetCenterStartY + cssY;
			// 不能超出容器范围
			if(targetCenterPosX < 0 ||targetCenterPosX > this.ulW || targetCenterPosY < 0 ||targetCenterPosY > this.ulH){
				return
			}
			// 3, 以targetCenterPos坐标来计算触控点所在的li的序号位置calcIndex
			var curCol = Math.floor(targetCenterPosX/this.liW) + 1;
			var curRow = Math.floor(targetCenterPosY/this.liH);
			var calcIndex = curRow * this.cols + curCol - 1;
			// 4, 以计算值calcIndex来得出插入位置reorderIndex, 基于在获取其他item来使用before插入activeItem的的原理
			var reorderIndex;
			// 区间1[负数 - 0] -->为0
			// 区间2[0 - startTargetIndex] -->为calcIndex
			// 区间3[startTargetIndex - this.draggableCount] -->为startTargetIndex
			// 区间4[this.draggableCount - 无限大] -->为draggableCount
			if(calcIndex < 0){
				reorderIndex = 0;
			}else if(calcIndex < this.startTargetIndex){
				reorderIndex = calcIndex;
			} else if (calcIndex >= this.draggableCount){
				reorderIndex = this.draggableCount;
			} else if (calcIndex >= this.startTargetIndex){
				reorderIndex = calcIndex + 1;
			}

			if(reorderIndex === this.MEMOreorderIndex){
				// 位移未超出一个li位置, 就取消执行
				return false;
			} else {
				// 5, 以reorderIndex作为插入的位置
				this.$items.eq(reorderIndex).before(this.$Target);
				// 记录本次位置
				this.MEMOreorderIndex = reorderIndex;
			} // 对比思路1, 由于位移的cssX与cssY是稳定的, 判断插入的位置只是基于文档位置的获取机制, 所以可以.
		},

		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/
		/*-----------------------------------------------------------------------------------------------*/

		applyTransition: function() {
			// 添加css  Transition
			var transition = {};

			transition[this.transitionType] = this.transformType + ' ' + this.options.resetDuration + 'ms ' + this.options.easing;

			this.$dragItem.css(transition);
		},

		disableTransition: function() {
			// 去掉css  Transition
			var transition = {};

			transition[this.transitionType] = '';

			this.$dragItem.css(transition);
		},

		size: function(){
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
			//console.log('ul data: rows = ', this.rows, ', cols = ', this.cols);
		},

		setProps: function() {
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
			this.startEvent = this.hasTouch ? 'touchstart.DraggableMenu': 'mousedown.DraggableMenu';
			this.stopEvent = this.hasTouch ? 'touchend.DraggableMenu': 'mouseup.DraggableMenu';
			this.moveEvent = this.hasTouch ? 'touchmove.DraggableMenu': 'mousemove.DraggableMenu';

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
		},

		setCSS: function(position) {
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
		},

		animateSlide: function(position, callback) {
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

		}
	};

	return (typeof define !== 'undefined') ? DraggableMenu : (window.DraggableMenu = DraggableMenu);

}));

