# arrangeTable

## 思考:
 
 1, 关闭按钮应该在初始化渲染item的时候用户自定义模板自己写的, 不是进入编辑模式由本组件完成的, 表象是组件控制了关闭按钮的出现与事件, 但逻辑上应该是关闭按钮初始化后就一直存在, 只是显示在事件判断出现
 2, 进入编辑模式原本有两个渠道:1,touchStart后设定时进入;2,拖拽初始化进入.这概念是保证了长按状态与拖拽状态都会进入, 但会产生重复进入, 所以设定了禁止同一个对象重复进入, 这个禁止也产生问题:第二次点击该对象不能进入编辑模式, 这也不对
 现在,只通过touchStart后设定时进入, 因为拖拽是长按才发生的, 而且长按后释放触控会执行stopEvent取消定时, 所以逻辑上更关心stopEvent的处理
 3, 更好的去解耦方法, 原本stopEvent是很累赘的方法, 因为包含很多逻辑, 这样需要把里面的逻辑与方法解耦出来, 分开了_enterEditMode/_quitEditMode与_removeDragItem/_renderDragItem

 // 本组件的原本思维是先让文本append到html里, 获取items格子的文本位置, 再让items脱离文本流, 重新定位排队, 所以初始化比较耗性能
 // 这样的思路是有利于提供多尺寸的items, 但由于posAry没有相应的调整, 所以其实没有意义!
 现在的思路是先把items以绝对定位append到html里, 然后获取item的尺寸作为容器的列数和行数, 也作为posAry的参考, 这样就一次性的脱离文本流

## 事件操作:
  
 点击item --> 跳转页面
 长按item --> 进入编辑模式 --> 松开item --> 点击任何item, 退出编辑模式
 长按item --> 进入编辑模式 --> 松开item --> 点击关闭按钮, 删除编辑的item, 退出编辑模式
 长按item --> 进入编辑模式 --> 拖拽item --> 拖动到新位置, items排序, 让出位置给排序item --> 在新位置松开item --> 被拖动的item有滑动归位效果

## 视觉效果及技术原理:
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

## 模式1: 文本流拖拽

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

## 模式2: 浮动拖拽

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

## 模拟步骤:
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

## 已优化部分
 1, 使用类方法
 2, 或添加关闭按钮
 3, 限定拖动范围
 4, 禁止多点触控(参考slick的swipeHandler里的方法)
 5, touch事件命名空间
 6, 拖拽时候, target是没有btn的, 所以需要添加一个class以至于可以隐藏
 7, 类私有变量和方法都使用下划线开头, 区分公开的变量方法
 8, $.proxy(func, this);
 9, 关闭按钮的容器高度调整为适应高度


## 心得:
 1, 多重兼容模式对于缺乏经验来说是挑战, 可能混乱了视线, 所以建议先做最优性能的, 最后才兼容
 2, 多缓存变量(原型变量), 多是不合理的
 3, 以触控点的文档坐标减去container的文档坐标, 来获取触控点相对于container的坐标是不准确的, 错误情况:缩放屏幕, 原因: 触控点与container的文档坐标获取原理不同??
 4, 设计过程, 分获取数据与渲染画面, 触发事件
 思考空间:
 uiTarget的缓存是保存currentGridIndex还是currentGridPos, 考虑到reorder只关心currentGridIndex与floatGridIndex, 但得益于gridPosAry, 可以以pos直接获取index, 或以index直接获取pos

## 改进空间:
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
 24, 剥离uiItems, uiTarget为构造函数 //okay!
 25, 做一个nuui版本
 26, //todo 需要对uiItems, uiTarget重新审查构想

