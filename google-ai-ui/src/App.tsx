import React, { useState } from 'react';
import { 
  Home, 
  PlusSquare, 
  Library, 
  Settings, 
  User, 
  ChevronLeft, 
  Image as ImageIcon,
  Scan,
  Maximize2,
  Smile,
  ChevronUp,
  UserPlus,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Settings2,
  Trash2,
  Download,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Theme Switcher ---
type Theme = 'light' | 'dark';

// --- Custom Hooks ---

const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = React.useRef(callback);
  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  React.useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
};

// --- Components ---

const ComparisonCard = ({ theme }: { theme: Theme }) => {
  const [showMorphed, setShowMorphed] = useState(false);
  useInterval(() => setShowMorphed(!showMorphed), 3000);

  return (
    <div className={`aspect-[3/4] ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'} backdrop-blur-md rounded-[2.5rem] border relative overflow-hidden group shadow-2xl shadow-black/20`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={showMorphed ? 'morphed' : 'original'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <div className={`absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs ${theme === 'dark' ? 'text-white/20' : 'text-black/20'} font-black uppercase tracking-widest`}>
              {showMorphed ? 'Dönüştürüldü' : 'Orijinal'}
            </div>
            {/* Morph Effect Simulation with Gradient Overlay */}
            <div className={`absolute inset-0 transition-all duration-1000 ${showMorphed ? 'bg-purple-500/20' : 'bg-transparent'}`} />
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black uppercase text-white tracking-widest border border-white/10">
        Demo Showcase
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
             <p className="text-white font-bold text-xs">Portrait Transformation</p>
             <p className="text-purple-400 text-[10px] uppercase font-black">AI Morphed</p>
          </div>
          <Zap size={14} className="text-purple-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

const AuthOverlay = ({ theme, onClose, onLogin }: { theme: Theme, onClose: () => void, onLogin: (user: any) => void }) => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`w-full max-w-md ${theme === 'dark' ? 'bg-[#121212] border-white/10' : 'bg-white border-black/5'} border rounded-[3rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden`}
      >
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-[80px]" />
        
        <button onClick={onClose} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="space-y-8 relative z-10">
          <div className="text-center space-y-2">
            <h2 className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
              {isLogin ? 'Hoş Geldiniz' : 'Hesap Oluştur'}
            </h2>
            <p className="text-gray-500 font-medium">FaceMorph topluluğuna katılarak yaratıcılığını serbest bırak.</p>
          </div>

          <div className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest ml-1">İsim Soyisim</label>
                <input type="text" className={`w-full bg-transparent border ${theme === 'dark' ? 'border-white/10 text-white' : 'border-black/10 text-black'} rounded-2xl px-5 py-3.5 focus:border-purple-500 focus:outline-none transition-all`} placeholder="Ahmet Yılmaz" />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest ml-1">E-Posta</label>
              <input type="email" className={`w-full bg-transparent border ${theme === 'dark' ? 'border-white/10 text-white' : 'border-black/10 text-black'} rounded-2xl px-5 py-3.5 focus:border-purple-500 focus:outline-none transition-all`} placeholder="ahmet@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest ml-1">Parola</label>
              <input type="password" className={`w-full bg-transparent border ${theme === 'dark' ? 'border-white/10 text-white' : 'border-black/10 text-black'} rounded-2xl px-5 py-3.5 focus:border-purple-500 focus:outline-none transition-all`} placeholder="••••••••" />
            </div>
          </div>

          <Button theme={theme} className="w-full py-4 text-base rounded-2xl shadow-xl shadow-purple-500/20" onClick={() => onLogin({ name: 'Ahmet Yüksel', email: 'ahmet@example.com' })}>
            {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </Button>

          <div className="text-center pt-4">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-bold text-gray-500 hover:text-purple-500 transition-colors"
            >
              {isLogin ? 'Hesabın yok mu? Kayıt Ol' : 'Zaten hesabın var mı? Giriş Yap'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Sidebar = ({ activeTab, setActiveTab, theme, toggleTheme, user, onProfileClick }: { 
  activeTab: string, 
  setActiveTab: (t: string) => void,
  theme: Theme,
  toggleTheme: () => void,
  user: any,
  onProfileClick: () => void
}) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Anasayfa' },
    { id: 'create', icon: PlusSquare, label: 'Oluştur' },
    { id: 'library', icon: Library, label: 'Kütüphane' },
    { id: 'settings', icon: Settings, label: 'Ayarlar' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex w-20 ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-white/40 border-black/5'} backdrop-blur-xl border-r flex-col items-center py-8 gap-8 fixed inset-y-0 left-0 z-50 transition-colors duration-500`}>
        <div className="mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Zap className="text-white fill-white" size={20} />
          </div>
        </div>
        
        <div className="flex flex-col gap-4 flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3 rounded-xl transition-all duration-300 flex flex-col items-center gap-1 group relative ${
                activeTab === tab.id 
                  ? (theme === 'dark' ? 'bg-white/10 text-white shadow-xl' : 'bg-black/5 text-black shadow-lg') 
                  : (theme === 'dark' ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-black hover:bg-black/5')
              }`}
            >
              <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-6 whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-4">
          <button 
            onClick={toggleTheme}
            className={`p-3 rounded-xl transition-colors ${theme === 'dark' ? 'text-yellow-400 hover:bg-white/5' : 'text-purple-600 hover:bg-black/5'}`}
          >
            {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          <button 
            onClick={onProfileClick}
            className={`p-3 transition-colors flex flex-col items-center gap-1 group relative ${
              activeTab === 'profile' 
                ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/5 text-black') 
                : (theme === 'dark' ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black')
            }`}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-6 h-6 rounded-full border border-purple-500" />
            ) : (
              <User size={22} />
            )}
            <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 whitespace-nowrap">
              {user ? 'Profil' : 'Giriş'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className={`md:hidden fixed bottom-0 inset-x-0 h-16 ${theme === 'dark' ? 'bg-black/80 border-white/10' : 'bg-white/80 border-black/5'} backdrop-blur-2xl border-t z-50 flex items-center justify-around px-4 transition-colors duration-500`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === tab.id 
                ? 'text-purple-500 scale-110' 
                : (theme === 'dark' ? 'text-gray-500' : 'text-gray-400')
            }`}
          >
            <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 1.5} />
            <span className="text-[10px] font-bold">{tab.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};

const Card = ({ children, title, className = "", theme }: { children: React.ReactNode, title?: string, className?: string, theme: Theme }) => (
  <div className={`${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'} backdrop-blur-md border rounded-3xl p-6 transition-colors duration-500 ${className}`}>
    {title && <h3 className={`${theme === 'dark' ? 'text-white' : 'text-black'} font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-xs`}>
      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
      {title}
    </h3>}
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', className = "", onClick, theme }: { children: React.ReactNode, variant?: 'primary' | 'secondary' | 'ghost' | 'outline', className?: string, onClick?: () => void, theme: Theme }) => {
  const variants = {
    primary: theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800',
    secondary: theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-black hover:bg-black/10',
    outline: theme === 'dark' ? 'border border-white/10 text-white hover:bg-white/5' : 'border border-black/10 text-black hover:bg-black/5',
    ghost: 'text-gray-400 hover:text-white transition-colors'
  };
  
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// --- Pages ---

const HomePage = ({ onStart, theme }: { onStart: () => void, theme: Theme }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
    <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 text-center lg:text-left"
      >
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${theme === 'dark' ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-600'} border border-purple-500/20`}>
          <Zap size={12} className="fill-current" />
          Profesyonel Dönüşüm
        </div>
        <h1 className={`text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1] ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
          Kendi tarzınızı <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">
            yansıtan içerikler
          </span> <br />
          oluşturun.
        </h1>
        <p className={`text-lg sm:text-xl max-w-md mx-auto lg:mx-0 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Yüz ifadelerini değiştir, yaşını ayarla ve görüntülerini hayal ettiğin şekilde dönüştür. Profesyonel araçlar cebinizde.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
          <Button onClick={onStart} theme={theme} className="px-10 py-5 text-lg rounded-3xl shadow-2xl shadow-purple-500/20">
            Hemen Başla
          </Button>
          <Button variant="secondary" theme={theme} className="px-8 py-5 text-lg rounded-3xl">
            Özellikleri Keşfet
          </Button>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-2 gap-6"
      >
        <ComparisonCard theme={theme} />
        <div className="hidden sm:block xl:hidden">
          <ComparisonCard theme={theme} />
        </div>
        <div className="hidden xl:block">
          <ComparisonCard theme={theme} />
        </div>
      </motion.div>
    </div>
  </div>
);

const CreatePage = ({ theme }: { theme: Theme }) => {
  const [intensity, setIntensity] = useState(50);

  return (
    <div className="flex-1 p-4 sm:p-8 flex flex-col gap-6 max-w-[1600px] mx-auto w-full mb-20 md:mb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-2xl sm:text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Oluştur</h2>
          <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} text-sm sm:text-base`}>Yüzünüzü dilediğiniz gibi şekillendirin.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" theme={theme} className="flex-1 sm:flex-none">
            <Trash2 size={16} /> <span className="hidden sm:inline">Temizle</span>
          </Button>
          <Button theme={theme} className="flex-1 sm:flex-none">
            <Download size={16} /> <span>Kaydet</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Upload */}
        <div className="lg:col-span-3 space-y-6">
          <Card title="Görsel Kaynağı" theme={theme}>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-sm mb-6`}>
              İşlem yapmak istediğiniz net bir fotoğraf yükleyin.
            </p>
            <div className={`border-2 border-dashed ${theme === 'dark' ? 'border-white/10 hover:border-purple-500/50' : 'border-black/10 hover:border-purple-500/50'} rounded-3xl p-10 flex flex-col items-center justify-center gap-4 bg-transparent transition-all cursor-pointer group`}>
              <div className={`w-14 h-14 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-500/20 transition-all`}>
                <ImageIcon className={theme === 'dark' ? 'text-gray-400 group-hover:text-purple-400' : 'text-gray-500 group-hover:text-purple-600'} size={28} />
              </div>
              <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Fotoğraf Seç</span>
            </div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 pt-8 border-t border-white/5 space-y-4">
              <div className={`flex items-center gap-3 p-3 rounded-2xl ${theme === 'dark' ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'} text-xs font-bold border border-green-500/20`}>
                <CheckCircle2 size={16} />
                <span>Görsel Analizi: Hazır</span>
              </div>
              <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                <span className={`${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'} text-[10px] font-black uppercase tracking-widest block mb-2`}>Dosya Bilgisi</span>
                <p className={`font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-black'}`}>portrait_01.jpg</p>
                <div className="flex justify-between items-center mt-2">
                   <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} text-xs`}>2440 x 3200 px</p>
                   <p className="text-purple-500 text-xs font-bold uppercase">PNG</p>
                </div>
              </div>
            </motion.div>
          </Card>
        </div>

        {/* Center: Preview */}
        <div className="lg:col-span-5 space-y-6 order-first lg:order-none">
          <Card theme={theme} className="h-full min-h-[400px] flex flex-col relative overflow-hidden group">
            {/* Background Decorative Blur */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] animate-pulse" />

            <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className={`${theme === 'dark' ? 'text-white' : 'text-black'} font-black uppercase text-xs tracking-widest flex items-center gap-2`}>
                <Scan size={14} className="text-purple-500" /> Kanvas
              </h3>
              <div className={`px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/5 text-black'} text-[10px] font-black uppercase tracking-tighter`}>
                 Live Preview
              </div>
            </div>

            <div className={`flex-1 ${theme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-white/40 border-black/5'} rounded-[2rem] overflow-hidden relative border flex items-center justify-center transition-all duration-700`}>
              <div className="w-full h-full bg-gradient-to-br from-transparent to-purple-500/5 flex items-center justify-center">
                 <div className="text-center space-y-4 opacity-20">
                    <ImageIcon size={64} className={theme === 'dark' ? 'text-white mx-auto' : 'text-black mx-auto'} />
                    <span className={`font-black text-4xl block ${theme === 'dark' ? 'text-white' : 'text-black'}`}>KANVAS</span>
                 </div>
              </div>
              
              <div className="absolute top-6 left-6 inline-flex items-center gap-2 bg-purple-600 px-4 py-2 rounded-2xl text-[10px] text-white shadow-xl shadow-purple-500/30 uppercase font-black tracking-widest">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                SİSTEM AKTİF
              </div>

              <div className="absolute bottom-6 inset-x-6 flex justify-between items-center">
                 <Button theme={theme} className="text-xs py-2 px-6 rounded-2xl">
                   <Maximize2 size={14} /> Otomatik Kırp
                 </Button>
                 <div className={`p-2 px-4 rounded-xl ${theme === 'dark' ? 'bg-white/5 text-gray-500' : 'bg-black/5 text-gray-400'} text-[10px] font-bold`}>
                   Wait for Action...
                 </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Features */}
        <div className="lg:col-span-4 space-y-6 overflow-y-auto lg:max-h-[calc(100vh-180px)] pr-2 scrollbar-hide pb-10">
          <Card theme={theme} className="p-0 overflow-hidden">
            <div className="flex flex-col">
              {/* Feature Header */}
              <div className={`p-6 border-b ${theme === 'dark' ? 'border-white/5' : 'border-black/5'} bg-gradient-to-r from-purple-500/10 to-transparent`}>
                 <h4 className={`text-lg font-black ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Kontrol Paneli</h4>
                 <p className="text-xs text-purple-500 font-bold uppercase tracking-widest mt-1">Gelişmiş Parametreler</p>
              </div>

              <div className="p-6 space-y-8">
                {/* Step 1 */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500 text-white font-black flex items-center justify-center text-xs shadow-lg shadow-purple-500/20">1</div>
                    <h5 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Yüz Tanımlama</h5>
                  </div>
                  <Button variant="secondary" theme={theme} className="w-full">Yüz Tarayıcısını Başlat</Button>
                </section>

                {/* Step 2 */}
                <section className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500 text-white font-black flex items-center justify-center text-xs shadow-lg shadow-purple-500/20">2</div>
                    <h5 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Morfing Noktaları</h5>
                  </div>
                  <div className={`flex justify-between items-center p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                     <div>
                       <p className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>468 Landmark</p>
                       <p className="text-xs text-purple-500/70 font-medium">Yüksek hassasiyetli tespit</p>
                     </div>
                     <div className="w-12 h-6 bg-purple-600 rounded-full relative p-1 cursor-pointer">
                       <div className="w-4 h-4 bg-white rounded-full ml-auto shadow-md" />
                     </div>
                  </div>
                </section>

                {/* Step 3 */}
                <section className="space-y-6 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500 text-white font-black flex items-center justify-center text-xs shadow-lg shadow-purple-500/20">3</div>
                    <h5 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Yüz Deformasyonu</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {['Gülümse', 'Kaş Kaldır', 'İncelt', 'Dudak Dolgun'].map((f) => (
                      <button key={f} className={`p-3 rounded-2xl border ${theme === 'dark' ? 'border-white/10 hover:border-purple-500/50 bg-white/5 text-gray-300' : 'border-black/5 hover:border-purple-600/50 bg-black/5 text-gray-700'} text-[10px] font-black uppercase transition-all hover:scale-[1.02]`}>
                        {f}
                      </button>
                    ))}
                  </div>
                  
                  <div className="space-y-3 p-4 rounded-2xl bg-black/20">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-purple-400">
                       <span>İşlem Gücü</span>
                       <span>{(intensity / 100).toFixed(1)}x</span>
                    </div>
                    <input 
                      type="range" 
                      value={intensity} 
                      onChange={(e) => setIntensity(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500" 
                    />
                  </div>

                  <Button theme={theme} className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black uppercase tracking-widest border-none shadow-xl shadow-purple-600/20">
                    Dönüşümü Uygula
                  </Button>
                </section>
              </div>
            </div>
          </Card>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <p className={`text-[10px] font-black text-center uppercase tracking-widest ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>Orijinal</p>
               <div className={`aspect-square ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} rounded-3xl border border-white/5`} />
             </div>
             <div className="space-y-2">
               <p className={`text-[10px] font-black text-center uppercase tracking-widest ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>Önizleme</p>
               <div className={`aspect-square ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} rounded-3xl border border-white/5 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 flex items-center justify-center`}>
                  <Zap size={24} className="text-purple-500 opacity-20" />
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsPage = ({ theme }: { theme: Theme }) => {
  const sections = [
    {
      title: 'Genel Proje Ayarları',
      desc: 'Sistem akışını yöneten temel tercihler.',
      items: [
        { label: 'Uygulama Adı', type: 'input', value: 'FaceMorph Pro' },
        { label: 'Buluta Yedekle', type: 'toggle', value: true },
        { label: 'Gelişmiş İpuçları', type: 'toggle', value: true },
      ]
    },
    {
      title: 'Dönüşüm Parametreleri',
      desc: 'Warp, kalite ve çıktı formatı ayarları.',
      items: [
        { label: 'İşlem Kalitesi', type: 'segmented', options: ['Hızlı', 'FHD', 'Ultra'], current: 'FHD' },
        { label: 'Çıktı Formatı', type: 'segmented', options: ['PNG', 'JPG', 'WEBP'], current: 'WEBP' },
        { label: 'Maksimum Çözünürlük', type: 'segmented', options: ['1080p', '2K', '4K'], current: '2K' },
      ]
    }
  ];

  return (
    <div className="flex-1 p-4 sm:p-12 max-w-4xl mx-auto w-full space-y-16 mb-20 md:mb-0">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 flex items-center justify-center text-purple-500 border border-purple-500/20">
            <Settings size={28} />
          </div>
          <h2 className={`text-3xl sm:text-5xl font-black ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Ayarlar</h2>
        </div>
        <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} font-medium`}>Uygulama deneyiminizi kişiselleştirin ve sistem performansını yönetin.</p>
      </div>

      {sections.map((section, idx) => (
        <section key={idx} className="space-y-8 relative">
          <div className={`border-l-4 border-purple-600 pl-6 ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} p-6 rounded-r-3xl`}>
            <h3 className={`text-xl font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{section.title}</h3>
            <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} text-sm mt-1`}>{section.desc}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {section.items.map((item, iIdx) => (
              <div key={iIdx} className="flex flex-col gap-3 group">
                <label className={`text-xs font-black uppercase tracking-widest ${theme === 'dark' ? 'text-gray-600 group-hover:text-purple-400' : 'text-gray-400 group-hover:text-purple-600'} transition-colors`}>{item.label}</label>
                
                {item.type === 'input' && (
                  <input 
                    type="text" 
                    defaultValue={item.value as string}
                    className={`bg-transparent border ${theme === 'dark' ? 'border-white/10 text-white focus:border-purple-500' : 'border-black/10 text-black focus:border-purple-600'} rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none transition-all`}
                  />
                )}

                {item.type === 'toggle' && (
                  <div className={`w-14 h-7 rounded-full relative p-1 cursor-pointer transition-all ${item.value ? 'bg-purple-600' : (theme === 'dark' ? 'bg-white/10' : 'bg-black/10')}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-all shadow-lg ${item.value ? 'ml-auto' : ''}`} />
                  </div>
                )}

                {item.type === 'segmented' && (
                  <div className={`flex gap-2 p-1.5 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} border ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}>
                    {item.options?.map((opt) => (
                      <button 
                        key={opt}
                        className={`flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                          item.current === opt 
                            ? 'bg-purple-600 text-white shadow-lg' 
                            : (theme === 'dark' ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black')
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

const ProfilePage = ({ theme, user, onLogout }: { theme: Theme, user: any, onLogout: () => void }) => {
  if (!user) return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
       <div className={`p-10 rounded-[3rem] ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} border border-white/5 backdrop-blur-xl shadow-2xl space-y-6`}>
         <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
            <User size={48} className="text-red-500" />
         </div>
         <h2 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-black'} uppercase tracking-tight`}>Oturum Açılmadı</h2>
         <p className="text-gray-500 font-bold uppercase tracking-widest max-w-xs mx-auto text-sm">
           Profilinizi görüntülemek ve çalışmalarınızı kaydetmek için lütfen giriş yapın.
         </p>
       </div>
    </div>
  );

  return (
    <div className="flex-1 p-4 sm:p-12 max-w-4xl mx-auto w-full space-y-12 mb-20 md:mb-0">
      <div className="flex flex-col sm:flex-row items-center gap-8 p-10 rounded-[3rem] bg-gradient-to-br from-purple-500/10 via-transparent to-indigo-500/10 border border-white/5">
        <div className="w-32 h-32 rounded-[2.5rem] bg-purple-600 flex items-center justify-center text-5xl font-black shadow-2xl shadow-purple-500/40 relative group overflow-hidden">
           {user.name?.[0] || 'U'}
           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <ImageIcon size={24} className="text-white" />
           </div>
        </div>
        <div className="text-center sm:text-left space-y-2">
           <h2 className={`text-3xl sm:text-5xl font-black ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{user.name}</h2>
           <p className="text-purple-500 font-black uppercase tracking-widest text-sm flex items-center justify-center sm:justify-start gap-2">
             <ShieldCheck size={16} /> Premium Üye
           </p>
           <p className="text-gray-500 font-medium">{user.email}</p>
        </div>
        <div className="sm:ml-auto">
           <Button variant="outline" theme={theme} onClick={onLogout} className="border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all">
             Çıkış Yap
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="İatistikler" theme={theme} className="flex flex-col gap-6">
           <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-3xl ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} text-center`}>
                 <p className="text-2xl font-black text-purple-500">24</p>
                 <p className="text-[10px] font-black uppercase text-gray-500">Morfing</p>
              </div>
              <div className={`p-4 rounded-3xl ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} text-center`}>
                 <p className="text-2xl font-black text-indigo-500">12</p>
                 <p className="text-[10px] font-black uppercase text-gray-500">Kaydedilen</p>
              </div>
           </div>
        </Card>
        <Card title="Cihaz Ayarları" theme={theme}>
           <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                 <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Cloud Sync</span>
                 <div className="w-10 h-5 bg-purple-600 rounded-full relative p-1">
                    <div className="w-3 h-3 bg-white rounded-full ml-auto" />
                 </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                 <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">HD Export</span>
                 <div className="w-10 h-5 bg-purple-600 rounded-full relative p-1">
                    <div className="w-3 h-3 bg-white rounded-full ml-auto" />
                 </div>
              </div>
           </div>
        </Card>
      </div>
    </div>
  );
};

const LibraryPage = ({ theme }: { theme: Theme }) => {
  const items = [
    { id: 1, title: 'Gece Portresi', date: '2 saat önce', type: 'Morfing' },
    { id: 2, title: 'Profil Yenileme', date: 'Dün', type: 'Deformasyon' },
    { id: 3, title: 'Avatar Denemesi', date: '3 gün önce', type: 'Yaşlandırma' },
    { id: 4, title: 'Sanatsal Çekim', date: '1 hafta önce', type: 'Morfing' },
  ];

  return (
    <div className="flex-1 p-4 sm:p-12 max-w-7xl mx-auto w-full space-y-10 mb-20 md:mb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className={`text-3xl sm:text-5xl font-black ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Kütüphane</h2>
          <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} font-medium`}>Kaydettiğiniz tüm çalışmaları buradan yönetin.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          {['Tümü', 'Morfing', 'Filtreler', 'Favoriler'].map((f, i) => (
            <button key={f} className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase whitespace-nowrap transition-all ${i === 0 ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : (theme === 'dark' ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-black/5 text-gray-500 hover:text-black')}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item) => (
          <motion.div 
            key={item.id}
            whileHover={{ y: -5 }}
            className={`group rounded-[2.5rem] p-4 ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-black/5 shadow-xl shadow-black/5'} border relative overflow-hidden`}
          >
            <div className={`aspect-square rounded-[2rem] ${theme === 'dark' ? 'bg-black/40' : 'bg-gray-100'} mb-4 overflow-hidden relative`}>
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <ImageIcon size={48} className={theme === 'dark' ? 'text-white' : 'text-black'} />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <div className="flex gap-2 w-full">
                  <Button variant="secondary" theme={theme} className="flex-1 py-2 text-[10px] rounded-xl bg-white/20 backdrop-blur-md border-none text-white">
                    İncele
                  </Button>
                  <button className="p-2 rounded-xl bg-white/20 backdrop-blur-md text-white">
                    <Download size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="px-2">
              <h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{item.title}</h4>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-purple-500 font-black uppercase">{item.type}</span>
                <span className="text-[10px] text-gray-500 font-medium">{item.date}</span>
              </div>
            </div>
          </motion.div>
        ))}
        <div className={`aspect-square sm:aspect-auto rounded-[2.5rem] border-2 border-dashed ${theme === 'dark' ? 'border-white/10 hover:border-purple-500/50' : 'border-black/10 hover:border-purple-500/50'} flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group`}>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
            <PlusSquare size={24} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Yeni Oluştur</span>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [theme, setTheme] = useState<Theme>('dark');
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleLogin = (userData: any) => {
    setUser(userData);
    setShowAuth(false);
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('home');
  };

  const handleProfileClick = () => {
    if (user) {
      setActiveTab('profile');
    } else {
      setShowAuth(true);
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#050505]' : 'bg-[#fcf8ff]'} text-white flex font-sans selection:bg-purple-500 selection:text-white transition-colors duration-700 relative overflow-hidden`}>
      {/* Mesh Background */}
      <div className="absolute inset-0 pointer-events-none">
         <div className={`absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full opacity-40 blur-[120px] transition-colors duration-1000 ${theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-200'}`} />
         <div className={`absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full opacity-30 blur-[120px] transition-colors duration-1000 ${theme === 'dark' ? 'bg-indigo-900/20' : 'bg-indigo-100'}`} />
         <div className={`absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] rounded-full opacity-30 blur-[120px] transition-colors duration-1000 ${theme === 'dark' ? 'bg-pink-900/20' : 'bg-pink-100'}`} />
         
         <div className={`absolute inset-0 opacity-[0.03] transition-opacity ${theme === 'dark' ? 'invert' : ''}`} style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }} />
      </div>

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        user={user}
        onProfileClick={handleProfileClick}
      />
      
      <main className="flex-1 md:ml-20 flex flex-col min-h-screen relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + theme}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex"
          >
            {activeTab === 'home' && <HomePage onStart={() => setActiveTab('create')} theme={theme} />}
            {activeTab === 'create' && <CreatePage theme={theme} />}
            {activeTab === 'library' && <LibraryPage theme={theme} />}
            {activeTab === 'settings' && <SettingsPage theme={theme} />}
            {activeTab === 'profile' && <ProfilePage theme={theme} user={user} onLogout={handleLogout} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showAuth && (
          <AuthOverlay 
            theme={theme} 
            onClose={() => setShowAuth(false)} 
            onLogin={handleLogin}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
