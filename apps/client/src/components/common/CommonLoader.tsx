type CommonLoaderProps = {
  label?: string;
};

const CommonLoader = ({ label = "Loading..." }: CommonLoaderProps) => {
  return (
    <div className="common-loader-wrap" role="status" aria-live="polite">
      <div className="common-loader-spinner" />
      <p className="common-loader-label">{label}</p>
    </div>
  );
};

export default CommonLoader;
