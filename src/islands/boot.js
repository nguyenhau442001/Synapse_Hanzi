// Stable entry loaded by index.html as `islands.js?v=<version>`.
// The app itself is built as a separate, content-hashed entry (chunks/app-[hash].js) so lazy island
// chunks import it by one canonical URL. If they imported the query-stamped entry instead, the browser
// would evaluate the whole app twice (two module instances), installing Preact Signals' hooks twice.
import './main.jsx';
