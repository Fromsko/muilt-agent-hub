import { describe, expect, it } from '@rstest/core';
import { render } from '@testing-library/react';
import App from './App';

describe('App', () => {
    it('should render AI Agent Platform title', () => {
        const { getByText } = render(<App />);
        expect(getByText('AI Agent Platform')).toBeInTheDocument();
    });

    it('should render subtitle with TailwindCSS V4', () => {
        const { getByText } = render(<App />);
        expect(getByText('Built with Ant Design + TailwindCSS V4 on Rsbuild')).toBeInTheDocument();
    });
});
