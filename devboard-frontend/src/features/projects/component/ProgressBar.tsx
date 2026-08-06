import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

export const MyProgress = ({ completion }: { completion: number }) => {
    
    return (
        <div style={{ width: 50, height: 50, margin: "10px" }}>
            <CircularProgressbar
                value={completion}
                counterClockwise
                strokeWidth={14}
                text={`${completion.toFixed(0)}%`}
                styles={buildStyles({
                    pathColor: '#34c9ff',
                    trailColor: '#e5e5e5f9',
                    strokeLinecap: 'round',
                    rotation: 0,
                    textSize: '34px',
                })}
            />
        </div>
    );
};


