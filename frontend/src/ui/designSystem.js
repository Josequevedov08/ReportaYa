/**
 * Design System ReportaYa - Sobrio, institucional y minimalista
 * Colores: Azul (#003049) y Rojo (#D62828) con gris neutro
 */

// Paleta de colores
export const colors = {
  // Azul institucional oscuro
  primary: {
    50: '#e0f2ff',
    100: '#b9ddff',
    200: '#91caff',
    300: '#69b3ff',
    400: '#4299ff',
    500: '#1a82ff',
    600: '#0065cc',
    700: '#004a99',
    800: '#003049',
    900: '#001f2e',
  },
  // Rojo para alertas y acentos
  red: {
    50: '#ffe0e0',
    100: '#ffb3b3',
    200: '#ff8080',
    300: '#ff4d4d',
    400: '#ff1a1a',
    500: '#d62828',
    600: '#a31d1d',
    700: '#731515',
    800: '#4d0d0d',
    900: '#2e0808',
  },
  // Escala de grises neutros
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  // Semáforo de antigüedad
  severity: {
    green: '#2d8c2d',  // 0-15 días
    yellow: '#d68c00', // 15-45 días
    red: '#b91c1c',    // 45+ días
  },
}

// Espaciados
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  xxl: '3rem',     // 48px
}

// Tipografía
export const typography = {
  // Sin fuentes decorativas ni guiones largos
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    xxl: '1.5rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
}

// Border radius (sobrio, sin bordes excesivamente redondeados)
export const radii = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
}

// Sombras (sutiles)
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
}

// Alturas de línea
export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  loose: 1.75,
}