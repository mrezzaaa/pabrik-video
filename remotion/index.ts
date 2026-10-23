import { registerRoot, Composition } from 'remotion';
import { BedahTemplate } from './compositions/BedahTemplate';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BedahVideo"
        component={BedahTemplate}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          topic: "KENAPA FREON AC GAK HABIS",
          beats: [],
          wordTimings: []
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
