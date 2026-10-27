/**
 * `@fuselab-creative/design-system@0.13.3` ships types, but its `exports`
 * map has no `types` condition, so `moduleResolution: bundler` cannot see
 * `dist/types.d.ts`. This declares the token surface charts import.
 * Values still come from the package at runtime.
 */
declare module '@fuselab-creative/design-system' {
  export const fontFamilies: {
    heading: string;
    body: string;
  };

  type TextStyle = {
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing?: string;
  };

  export const typography: {
    body: {
      lg: { regular: TextStyle };
      md: { regular: TextStyle };
      sm: { regular: TextStyle };
      xs: { regular: TextStyle & { letterSpacing: string } };
    };
  };

  type Theme = {
    colors: {
      dataViz: {
        sequential_7_1: string[];
        qualitative_2_1: string[];
        qualitative_2_2: string[];
        qualitative_4: string[];
        qualitative_12: string[];
      };
    };
  };

  export const lightTheme: Theme;
  export const darkTheme: Theme;

  export function Typography(props: {
    children?: string;
    type?: 'body' | 'heading';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    variant?: string;
    weight?: 'regular' | 'semibold' | 'medium' | 'underline';
    textAlign?: 'left' | 'center' | 'right';
    color?: 'default' | 'weak' | 'weaker' | 'weakest';
    as?: string;
  }): import('react').ReactElement;
}
