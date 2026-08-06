interface StackListProps {
    id: number;
    name: string;
    project_id: number;
}

export default function StackList({ techStack }: { techStack: StackListProps[] }) {
    return (
        <>
            <h2>Tech Stack:</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:"10px" }}>
                {techStack.map((stack) => <li className="stackList" key={stack.id} >{stack.name}</li>)}
            </div>
        </>
    );
}