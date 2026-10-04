import cvmindLogo from '../assets/cvmind_logo_transparent.png';
import './PageLoader.css';

interface PageLoaderProps {
  label?: string;
}

// Full-screen CV Mind splash shown while moving between pages
export default function PageLoader({ label = 'Loading' }: PageLoaderProps) {
  return (
    <div className="page-loader" role="status" aria-label={label}>
      <img src={cvmindLogo} alt="" className="page-loader-logo" />
      <div className="page-loader-bar"><span /></div>
    </div>
  );
}
