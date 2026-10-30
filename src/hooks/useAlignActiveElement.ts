import type { ElementAlignCommands } from '@/types/edit'
import useElementAlignment from './useElementAlignment'
export default () => {
  const { run }=useElementAlignment()
  return { alignActiveElement: (command: ElementAlignCommands) => run(command, 'selection') }
}
