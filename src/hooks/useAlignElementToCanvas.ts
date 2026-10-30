import type { ElementAlignCommands } from '@/types/edit'
import useElementAlignment from './useElementAlignment'
export default () => {
  const { run }=useElementAlignment()
  return { alignElementToCanvas: (command: ElementAlignCommands) => run(command, 'slide') }
}
