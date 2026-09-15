interface StackListProps {
    id: number;
    name: string;
    project_id: number;
}

export default function StackList({ techStack }: { techStack: StackListProps[] }) {
    return (
        <>
            <h2>Tech Stack:</h2>
            <div className="tech-stack-grid">
                {techStack.map((stack) => <li className="stackList" key={stack.id}>{stack.name}</li>)}
            </div>
        </>
    );
}
