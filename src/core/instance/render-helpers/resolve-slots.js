/*
 * @Author: 吴文洁
 * @Date: 2020-06-30 17:53:29
 * @LastEditors: 吴文洁
 * @LastEditTime: 2021-04-27 17:26:21
 * @Description: 
 * @Copyright: © 2021 上海微盟科技有限公司 版权所有
 */
/* @flow */

import type VNode from 'core/vdom/vnode'

export function resolveSlots (
  children: ?Array<VNode>,
  context: ?Component
): { [key: string]: Array<VNode> } {
  // children是父组件需要分发到子组件的vnode节点，如果children不存在，则没有分发内容
  if (!children || !children.length) {
    return {}
  }
  const slots = {}
  for (let i = 0, l = children.length; i < l; i++) {
    const child = children[i]
    const data = child.data
    // 如果结点已经被解析为了slot，那么删除节点上的slot属性
    if (data && data.attrs && data.attrs.slot) {
      delete data.attrs.slot
    }
    
    // 具名slot分支
    if ((child.context === context || child.fnContext === context) &&
      data && data.slot != null
    ) {
      const name = data.slot
      // 将name相同的slot进行归类
      const slot = (slots[name] || (slots[name] = []))
      if (child.tag === 'template') {
        slot.push.apply(slot, child.children || [])
      } else {
        slot.push(child)
      }
    } else {
      // 匿名slot，核心逻辑是构造{ default: [children] }对象返回
      (slots.default || (slots.default = [])).push(child)
    }
  }
  // ignore slots that contains only whitespace
  for (const name in slots) {
    if (slots[name].every(isWhitespace)) {
      delete slots[name]
    }
  }
  return slots
}

function isWhitespace (node: VNode): boolean {
  return (node.isComment && !node.asyncFactory) || node.text === ' '
}
