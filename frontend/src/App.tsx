import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { PadPage } from './PadPage';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/p/:padId" element={<PadPage />} />
            </Routes>
        </Router>
    );
}

export default App;
