import useElementAlignment from './useElementAlignment'
export default () => {
  const {count,run}=useElementAlignment()
  return { displayItemCount:count, uniformHorizontalDisplay:()=>run('distribute-horizontal','selection'), uniformVerticalDisplay:()=>run('distribute-vertical','selection') }
}
