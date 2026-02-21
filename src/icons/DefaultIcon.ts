import { defineComponent, h } from 'vue'

export const DefaultIcon = defineComponent({
  name: 'DefaultIcon',
  props: {
    size: { type: Number, default: 20 },
    className: { type: String, default: undefined },
  },
  setup(props) {
    return () => h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      width: props.size,
      height: props.size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      class: props.className,
    }, [
      h('path', { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' }),
      h('path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' }),
    ])
  },
})
