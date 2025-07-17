import React from 'react';

interface ExampleComponentProps {
    message: string;
}

const ExampleComponent: React.FC<ExampleComponentProps> = ({ message }) => {
    return (
        <div>
            <p>{message}</p>
        </div>
    );
};

export default ExampleComponent;