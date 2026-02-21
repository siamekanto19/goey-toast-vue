import { defineComponent, h } from 'vue'

export const ErrorIcon = defineComponent({
  name: 'ErrorIcon',
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
      h('circle', { cx: '12', cy: '12', r: '10' }),
      h('path', { d: 'M15 9l-6 6' }),
      h('path', { d: 'M9 9l6 6' }),
    ])
  },
})
