import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import DonorPage from './pages/DonorPage'
import RecipientPage from './pages/RecipientPage'
import DriverPage from './pages/DriverPage'
import CoordinatorPage from './pages/CoordinatorPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/*"
            element={
              <>
                <Navbar />
                <Routes>
                  <Route path="/donor" element={<DonorPage />} />
                  <Route path="/recipient" element={<RecipientPage />} />
                  <Route path="/driver" element={<DriverPage />} />
                  <Route path="/coordinator" element={<CoordinatorPage />} />
                </Routes>
              </>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
