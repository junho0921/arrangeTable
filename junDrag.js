// 分析事件:
// 长按按钮达到一定程度 -> 实现拖动 -> 拖动效果...
// 拖动状态时候, 触控点的位置差生新的空白格(先忽略动画效果), li重新排序(动画效果先忽略)
// 放开触控, 判断触控点位置, 移除空白格, 重新排位(先忽略动画效果)
function junDrag(options){

// options
	var timeDuration = (options && options.timeDuration) || 250,
		$ul = (options && options.ul && $(options.ul)) || $('.junDrag'),
		$li = $ul.find('li');

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
	var startTime, checkTime, setTimeoutDrag, eventStartX, eventStartY;

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
		setTimeoutDrag = setTimeout(function(){drag(event, $this)}, timeDuration);

		// 绑定事件stopEvent
		$('body').one(stopEvent, function(event){
			$ul.find('li').removeClass('active').css('opacity',1); // 此处应优化动画效果
			$ul.find('.clone').remove(); // 此处应优化动画效果
			clearTimeout(setTimeoutDrag);
			$('body').off(moveEvent);
			return false;
			// 监听触控点位置, 在ul插入本对象li
		});
	});

	var drag = function(event, $this){
		// 需要重新获取$li, 不然出现Bug: 多次排序出错
		$li = $ul.find('li');

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
