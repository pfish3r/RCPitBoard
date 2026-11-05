import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import fontScale from './font-scale.js';

export default {
  plugins: [tailwindcss(), autoprefixer(), fontScale()],
};
