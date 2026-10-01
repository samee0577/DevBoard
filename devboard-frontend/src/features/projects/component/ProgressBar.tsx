import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

export const MyProgress = ({ completion , style }: { completion: number; style?: React.CSSProperties }) => {
    
    return (
        <div style={{ width: 60, height: 60, margin: "5px" ,fontWeight: '500', ...style }}>
            <CircularProgressbar
                value={completion}
                counterClockwise
                strokeWidth={6}
                text={`${completion.toFixed(0)}%`}
                styles={buildStyles({
                    pathColor: '#34c9ff',
                    trailColor: '#e5e5e5f9',
                    strokeLinecap: 'round',
                    rotation: 0,
                    textSize: '32px',
                    })}
            />
        </div>
    );
};


