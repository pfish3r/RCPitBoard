// Scale explicit font sizes once, after Tailwind expands its utilities.
// em/% values already inherit the scaled parent and must not be scaled twice.
export default function fontScale() {
  return {
    postcssPlugin: 'rcpitboard-font-scale',
    OnceExit(root) {
      root.walkDecls('font-size', declaration => {
        const value = declaration.value.trim();
        if (/^(inherit|initial|unset|revert|revert-layer|0)$/.test(value)
          || /(?:\d|\.)(?:em|%)(?=[\s),]|$)/.test(value)
          || value.includes('--rd-font-scale')) return;
        declaration.value = `calc(${value} * var(--rd-font-scale, 0.8))`;
      });
    },
  };
}
