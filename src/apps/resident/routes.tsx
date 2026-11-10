import { Navigate, Route, Routes } from 'react-router-dom';
import { useResident } from '../../store/hooks';
import { PhoneAside } from '../launcher/PhoneAside';
import { StorageNotice } from '../../ui/StorageNotice';
import { UiFlavor } from '../../ui/flavor';
import { PhoneFrame } from '../../ui/PhoneFrame';
import Login from './auth/Login';
import Otp from './auth/Otp';
import Splash from './auth/Splash';
import UnitPicker from './auth/UnitPicker';
import Welcome from './auth/Welcome';
import CommercialHome from './home/CommercialHome';
import RenterHome from './home/RenterHome';
import SubsidizedHome from './home/SubsidizedHome';
import { RequireFeature } from './RequireFeature';
import { ResidentShell } from './ResidentShell';
import Account from './screens/Account';
import Bills from './screens/Bills';
import Businesses from './screens/Businesses';
import Cards from './screens/Cards';
import Cctv from './screens/Cctv';
import Complaint from './screens/Complaint';
import ComplaintCapture from './screens/ComplaintCapture';
import ComplaintTracker from './screens/ComplaintTracker';
import Emergency from './screens/Emergency';
import Feedback from './screens/Feedback';
import Handbook from './screens/Handbook';
import Handover from './screens/Handover';
import Legal from './screens/Legal';
import ListingDetail from './screens/ListingDetail';
import ListingPost from './screens/ListingPost';
import Locked from './screens/Locked';
import Marketplace from './screens/Marketplace';
import MoveIn from './screens/MoveIn';
import Notifications from './screens/Notifications';
import Projects from './screens/Projects';
import Renovation from './screens/Renovation';
import RenovationDetail from './screens/RenovationDetail';
import RenterRegistrationWizard from './screens/RenterRegistrationWizard';
import Renters from './screens/Renters';
import Rules from './screens/Rules';
import Vouchers from './screens/Vouchers';
import Wifi from './screens/Wifi';

function Home() {
  const ctx = useResident();
  if (!ctx) return null;
  if (ctx.role === 'renter') return <RenterHome />;
  return ctx.segment === 'komersil' ? <CommercialHome /> : <SubsidizedHome />;
}

function Entry() {
  return <Navigate to={useResident() ? '/app/home' : '/app/splash'} replace />;
}

export default function ResidentApp() {
  return (
    <UiFlavor value="premium">
      <PhoneFrame aside={<PhoneAside />}>
        <StorageNotice />
        <Routes>
          <Route index element={<Entry />} />
          <Route path="splash" element={<Splash />} />
          <Route path="login" element={<Login />} />
          <Route path="otp" element={<Otp />} />
          <Route path="units" element={<UnitPicker />} />
          <Route path="welcome" element={<Welcome />} />
          <Route element={<ResidentShell />}>
            <Route path="home" element={<Home />} />
            <Route path="bills" element={<RequireFeature f="bills"><Bills /></RequireFeature>} />
            <Route path="market" element={<RequireFeature f="marketplace"><Marketplace /></RequireFeature>} />
            <Route path="market/new" element={<RequireFeature f="marketplace"><ListingPost /></RequireFeature>} />
            <Route path="market/:id" element={<RequireFeature f="marketplace"><ListingDetail /></RequireFeature>} />
            <Route path="vouchers" element={<RequireFeature f="vouchers"><Vouchers /></RequireFeature>} />
            <Route path="account" element={<Account />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="handover" element={<RequireFeature f="handover"><Handover /></RequireFeature>} />
            <Route path="rules" element={<RequireFeature f="rules"><Rules /></RequireFeature>} />
            <Route path="move-in" element={<RequireFeature f="moveIn"><MoveIn /></RequireFeature>} />
            <Route path="wifi" element={<RequireFeature f="wifi"><Wifi /></RequireFeature>} />
            <Route path="cards" element={<RequireFeature f="cards"><Cards /></RequireFeature>} />
            <Route path="renters" element={<RequireFeature f="renterRegistration"><Renters /></RequireFeature>} />
            <Route path="renters/new" element={<RequireFeature f="renterRegistration"><RenterRegistrationWizard /></RequireFeature>} />
            <Route path="renovation" element={<RequireFeature f="renovation"><Renovation /></RequireFeature>} />
            <Route path="renovation/:id" element={<RequireFeature f="renovation"><RenovationDetail /></RequireFeature>} />
            <Route path="complaint" element={<RequireFeature f="complaint" allow={['windowClosed']}><Complaint /></RequireFeature>} />
            <Route path="complaint/new/:room" element={<RequireFeature f="complaint"><ComplaintCapture /></RequireFeature>} />
            <Route path="complaint/track" element={<RequireFeature f="complaint"><ComplaintTracker /></RequireFeature>} />
            <Route path="legal" element={<RequireFeature f="legal"><Legal /></RequireFeature>} />
            <Route path="emergency" element={<RequireFeature f="panic" allow={['notOccupied']}><Emergency /></RequireFeature>} />
            <Route path="cctv" element={<RequireFeature f="cctv"><Cctv /></RequireFeature>} />
            <Route path="feedback" element={<RequireFeature f="feedback"><Feedback /></RequireFeature>} />
            <Route path="businesses" element={<RequireFeature f="businesses"><Businesses /></RequireFeature>} />
            <Route path="projects" element={<RequireFeature f="projects"><Projects /></RequireFeature>} />
            <Route path="handbook" element={<RequireFeature f="handbook"><Handbook /></RequireFeature>} />
            <Route path="locked/:feature" element={<Locked />} />
          </Route>
          <Route path="*" element={<Entry />} />
        </Routes>
      </PhoneFrame>
    </UiFlavor>
  );
}
