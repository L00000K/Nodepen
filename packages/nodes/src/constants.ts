export const CAMERA = {
  MINIMUM_ZOOM: 0.25,
  MAXIMUM_ZOOM: 4,
  ZOOM_BREAKPOINT_NEAR: 2.5,
  ZOOM_BREAKPOINT_FAR: 0.75,
} as const

export const COLORS = {
  /* Grayscale */
  DARK: '#414141',
  GREY: 'E7E7E7',
  LIGHT: '#FFFFFF',
  /* Neutrals */
  PALE: '#EFF2F2',
  /* Primary */
  GREEN: '#98E2C6',
  SWAMPGREEN: '#7BBFA5',
  DARKGREEN: '#093824',
  /* Special */
  ERROR: '#FF7171',
  WARN: '#FFBE71',
} as const

export const DIMENSIONS = {
  NODE_INTERNAL_PADDING: 5,
  NODE_LABEL_FONT_SIZE: 16,
  NODE_LABEL_WIDTH: 32,
  NODE_MINIMUM_HEIGHT: 80,
  NODE_PORT_LABEL_FONT_SIZE: 18,
  NODE_PORT_LABEL_OFFSET: 12,
  NODE_PORT_MINIMUM_HEIGHT: 40,
  NODE_PORT_MINIMUM_WIDTH: 50,
  NODE_PORT_RADIUS: 5,
} as const

export const STYLES = {
  BUTTON: {
    SMALL: {
      xmlns: 'http://www.w3.org/2000/svg',
      width: 16,
      height: 16,
      fill: 'none',
      viewBox: '0 0 24 24',
      strokeWidth: 3,
      vectorEffect: 'non-scaling-stroke',
      stroke: COLORS.DARK,
    },
  },
} as const

export const KEYS = {
  TOOLTIPS: {
    ADD_NODE_MENU_OPTION_HOVER: 'add-node-menu',
  },
} as const
