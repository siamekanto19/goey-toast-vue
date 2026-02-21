import { defineComponent, h } from 'vue'

export const SpinnerIcon = defineComponent({
  name: 'SpinnerIcon',
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
      h('path', { d: 'M21 12a9 9 0 1 1-6.219-8.56' }),
    ])
  },
})
