import { Button, Card, Typography } from 'antd';
import './App.css';

const { Title, Paragraph } = Typography;

const App = () => {
    return (
        <div className="content">
            <Card className="w-full max-w-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                <Title level={1} className="text-white mb-4">
                    AI Agent Platform
                </Title>
                <Paragraph className="text-white/70 text-lg mb-6">
                    Built with Ant Design + TailwindCSS V4 on Rsbuild
                </Paragraph>
                <div className="flex gap-4 justify-center">
                    <Button type="primary" size="large" className="bg-blue-500 hover:bg-blue-600 border-none">
                        Get Started
                    </Button>
                    <Button size="large" className="border-white/30 text-white hover:text-white hover:border-white/50">
                        Learn More
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default App;
