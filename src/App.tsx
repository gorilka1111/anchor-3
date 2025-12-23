import { Ribbon } from './components/UI/Ribbon';
import { MainStage } from './components/Canvas/MainStage';

function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#1a1a1a]">
      <Ribbon />
      <div className="flex-1 w-full h-full">
        <MainStage />
      </div>
    </div>
  );
}

export default App;
