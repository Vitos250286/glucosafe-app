import React, { useState, useEffect } from 'react';
// Иконки
import { 
  Plus, BarChart2, Home, Activity, Trash2, Info, AlertCircle, Brain, 
  Sparkles, X, Send, Calendar, LogOut, RefreshCw, TrendingUp, Edit2, 
  Save, User, Check, Loader2, Droplet, Leaf, Moon, Footprints, ChevronRight 
} from 'lucide-react';

// --- CONFIGURATION ---
const SUPABASE_URL = "https://plcayzltlepyngebqzjl.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsY2F5emx0bGVweW5nZWJxempsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4ODMyMzYsImV4cCI6MjA4NTQ1OTIzNn0.Mwpggd6k5jGTHbS-zSYwbPfSQVRBqaXA4hIiyn13iRM"; 

// Глобальные переменные для клиента и конфига ИИ
let supabase = null;
let apiConfig = { key: '', model: 'gemini-2.5-flash' };

// --- GEMINI API ---
async function callGeminiAPI(prompt, isJson = false) {
  try {
    if (!apiConfig.key) {
        throw new Error("API ключ еще не загружен из базы данных");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${apiConfig.model}:generateContent?key=${apiConfig.key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: isJson ? { responseMimeType: "application/json" } : {}
        }),
      }
    );
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return isJson && text ? JSON.parse(text) : text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
}

// --- HELPER FUNCTIONS ---
const getTodayString = () => new Date().toISOString().split('T')[0];

// --- UI COMPONENTS ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

const ButtonPrimary = ({ children, onClick, disabled, className = "", isLoading }) => (
  <button 
    onClick={onClick} 
    disabled={disabled || isLoading}
    className={`w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-indigo-200 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 ${className}`}
  >
    {isLoading ? <Loader2 className="animate-spin" size={20}/> : children}
  </button>
);

const IconButton = ({ icon: Icon, onClick, colorClass = "text-slate-400 hover:text-slate-600", bgClass = "hover:bg-slate-50" }) => (
  <button 
    onClick={onClick}
    className={`p-2 rounded-xl transition-colors ${colorClass} ${bgClass}`}
  >
    <Icon size={20} />
  </button>
);

// --- МОДАЛЬНОЕ ОКНО АВТОРОВ ---
const AboutModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={onClose}></div>
      <Card className="w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200 pointer-events-auto relative z-10">
        <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl">
            <Info size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">О проекте</h3>
            <p className="text-sm text-slate-500">GlucoSafe AI</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Разработчик</span>
            <p className="text-sm font-bold text-slate-800">Дильназ Камзина</p>
            <p className="text-xs text-slate-500 mt-0.5">Ученица 8С класса, НИШ г. Павлодар</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Научный руководитель</span>
             <p className="text-sm font-bold text-slate-800">Алмагуль Асаинова</p>
             <p className="text-xs text-slate-500 mt-0.5">Профессор, к.п.н.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// --- AUTH COMPONENT ---
const AuthScreen = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!login || !password) return setError("Заполните все поля");
    setLoading(true);
    setError('');

    try {
      if (!supabase) throw new Error("База данных не подключена");

      if (isRegistering) {
        const { data: exist } = await supabase.from('user_credentials').select('id').eq('login', login);
        if (exist && exist.length > 0) throw new Error("Этот логин уже занят");

        const { data, error } = await supabase.from('user_credentials').insert([{ login, password }]).select();
        if (error) throw error;
        onLogin(data[0]);
      } else {
        const { data, error } = await supabase.from('user_credentials').select('*').eq('login', login).eq('password', password);
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Неверный логин или пароль");
        onLogin(data[0]);
      }
    } catch (e) {
      setError(e.message || "Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-violet-200 rounded-full blur-3xl opacity-30"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-30"></div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="bg-white p-4 rounded-3xl shadow-lg inline-block mb-4">
            <Activity size={40} className="text-violet-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">GlucoSafe AI</h1>
          <p className="text-slate-500">Ваш умный помощник в контроле диабета</p>
        </div>
        
        <Card className="p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
              {isRegistering ? "Создать профиль" : "С возвращением"}
            </h2>

            <div className="space-y-4">
            <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18}/>
                <input 
                value={login} onChange={e => setLogin(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent focus:bg-white border focus:border-violet-500 rounded-2xl outline-none transition-all font-medium text-slate-700"
                placeholder="Логин"
                />
            </div>
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors">•••</div>
                <input 
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent focus:bg-white border focus:border-violet-500 rounded-2xl outline-none transition-all font-medium text-slate-700"
                placeholder="Пароль"
                />
            </div>
            
            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle size={16}/> {error}
                </div>
            )}
            
            <ButtonPrimary onClick={handleSubmit} isLoading={loading}>
                {isRegistering ? "Зарегистрироваться" : "Войти"}
            </ButtonPrimary>
            </div>
        </Card>

        <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full text-slate-500 font-medium text-sm mt-6 hover:text-violet-600 transition-colors"
        >
            {isRegistering ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Создать"}
        </button>
      </div>
    </div>
  );
};

// --- APP COMPONENTS ---

const MetricCard = ({ title, value, max, color, description, icon }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const bgClass = color.replace('text-', 'bg-');
  
  return (
    <Card className="p-5 mb-3 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl bg-slate-50 ${color}`}>
                {icon || <Activity size={18}/>}
            </div>
            <div>
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</h3>
                <p className="text-xs text-slate-400 leading-tight mt-0.5">{description}</p>
            </div>
        </div>
        <span className={`text-2xl font-bold ${color}`}>{value.toFixed(1)}</span>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${bgClass}`} style={{ width: `${percentage}%` }}></div>
      </div>
    </Card>
  );
};

const SmartEntryModal = ({ isOpen, onClose, onAddItems }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSmartAdd = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError('');

    const prompt = `
      Ты помощник нутрициолога. Текст: "${inputText}".
      Извлеки продукты, оцени вес (если не указан - стандартная порция).
      ВАЖНО: Поля carbs, sugar, fiber должны содержать ОБЩЕЕ количество грамм ВО ВСЕЙ ПОРЦИИ (а не на 100г).
      Верни JSON массив: [{ "name": "...", "gi": 50, "carbs": 20, "sugar": 5, "fiber": 2, "portion_grams": 150 }]
    `;

    const items = await callGeminiAPI(prompt, true);

    if (items && Array.isArray(items) && items.length > 0) {
      onAddItems(items);
      setInputText('');
      onClose();
    } else {
      setError('Не удалось распознать. Убедитесь, что ИИ ключ настроен верно, или попробуйте точнее.');
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={onClose}></div>
      
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 pointer-events-auto relative">
        <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={20} /></button>
        
        <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl">
                <Sparkles size={24} />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-800">Что вы съели?</h3>
                <p className="text-sm text-slate-500">AI проанализирует и добавит</p>
            </div>
        </div>
        
        <textarea
          value={inputText} onChange={(e) => setInputText(e.target.value)}
          className="w-full h-32 bg-slate-50 border-none rounded-2xl p-4 text-base mb-4 focus:ring-2 focus:ring-violet-200 focus:bg-white transition-all placeholder:text-slate-400 resize-none"
          placeholder='Например: "Овсянка на молоке, кофе с сахаром и яблоко"' autoFocus
        />
        {error && <div className="p-3 bg-red-50 text-red-500 text-xs rounded-xl mb-4 flex items-center gap-2"><AlertCircle size={14}/> {error}</div>}

        <ButtonPrimary onClick={handleSmartAdd} disabled={isLoading || !inputText} isLoading={isLoading}>
           Распознать и добавить
        </ButtonPrimary>
      </div>
    </div>
  );
};

const TodayScreen = ({ log, lifestyle, setLifestyle, onRemoveFood, onUpdateFood, onSaveLifestyle, onSmartAdd, isSaving }) => {
  const [isSmartModalOpen, setIsSmartModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editGrams, setEditGrams] = useState('');
  
  const [saveStatus, setSaveStatus] = useState('idle');

  const handleManualSave = async () => {
    setSaveStatus('loading');
    const success = await onSaveLifestyle();
    if (success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2500);
    } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditGrams(item.grams);
  };

  const saveEditing = (item) => {
    const newGrams = Math.round(Number(editGrams));
    if (!newGrams || newGrams <= 0) return;
    const ratio = newGrams / item.grams;
    const updatedItem = {
      ...item,
      grams: newGrams,
      carbs: item.carbs * ratio,
      sugar: item.sugar * ratio,
      fiber: item.fiber * ratio,
      gl: ((item.carbs * ratio) * item.gi) / 100
    };
    onUpdateFood(updatedItem);
    setEditingId(null);
  };

  const totalFiber = log.reduce((acc, item) => acc + (Number(item.fiber) || 0), 0);

  const Stepper = ({ label, icon: Icon, value, unit, step, onChange, colorClass }) => (
    <Card className="p-4 flex flex-col justify-between h-full">
        <div className="flex items-center gap-2 mb-2">
            <Icon size={18} className={colorClass} />
            <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
        </div>
        <div className="flex items-center justify-between mt-auto">
            <button 
                onClick={() => onChange(Math.max(0, value - step))}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 active:scale-90 transition-transform"
            >
                -
            </button>
            <div className="text-center">
                <span className="text-xl font-bold text-slate-800 block leading-none">{value}</span>
                <span className="text-[10px] text-slate-400">{unit}</span>
            </div>
            <button 
                onClick={() => onChange(value + step)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-md ${colorClass.replace('text-', 'bg-')}`}
            >
                +
            </button>
        </div>
    </Card>
  );

  return (
    <div className="space-y-6 pb-28">
      <SmartEntryModal isOpen={isSmartModalOpen} onClose={() => setIsSmartModalOpen(false)} onAddItems={onSmartAdd} />
      
      {/* Питание */}
      <section>
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-xl font-bold text-slate-800">Питание</h2>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
            <Leaf size={14} className="text-green-500" />
            <span className="text-sm font-bold text-slate-700">{totalFiber.toFixed(1)} г</span>
            <span className="text-xs text-slate-400">клетчатки</span>
          </div>
        </div>

        {log.length > 0 ? (
          <div className="space-y-3 mb-4">
            {log.map((item, idx) => {
                 const borderColor = item.gl > 20 ? 'bg-red-500' : item.gl > 10 ? 'bg-orange-500' : 'bg-green-500';
                 return (
                    <Card key={idx} className="p-0 flex flex-row animate-in slide-in-from-bottom-2 duration-300">
                        <div className={`w-1.5 ${borderColor}`}></div>
                        <div className="flex-1 p-4 flex items-center justify-between">
                            <div className="flex-1 pr-2">
                                <p className="font-semibold text-slate-800 text-sm leading-tight mb-1">{item.name}</p>
                                
                                {editingId === item.id ? (
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={editGrams} 
                                            onChange={(e) => setEditGrams(e.target.value)}
                                            className="w-16 p-1 text-sm bg-slate-50 rounded border border-indigo-200 focus:outline-none"
                                            autoFocus
                                        />
                                        <span className="text-xs text-slate-400">г</span>
                                        <button onClick={() => saveEditing(item)} className="p-1.5 bg-green-100 text-green-600 rounded-lg"><Check size={14}/></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                        <span>{item.grams}г</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>Угл: {item.carbs.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">GL {(item.gl || 0).toFixed(0)}</span>
                                <div className="flex gap-1 mt-1">
                                    <button onClick={() => startEditing(item)} className="p-1.5 text-slate-300 hover:text-indigo-600"><Edit2 size={14} /></button>
                                    <button onClick={() => onRemoveFood(item.id)} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    </Card>
            )})}
          </div>
        ) : (
             <div className="text-center py-10 opacity-50">
                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar size={24} className="text-slate-400"/>
                </div>
                <p className="text-sm">Пока нет записей сегодня</p>
             </div>
        )}

        <button 
          onClick={() => setIsSmartModalOpen(true)}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-3xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
        >
          <div className="bg-slate-700 p-1 rounded-full"><Plus size={16} /></div>
          <span className="font-medium">Добавить прием пищи</span>
        </button>
      </section>

      {/* Образ жизни */}
      <section>
        <h2 className="text-xl font-bold text-slate-800 mb-4 px-2">Активность</h2>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Stepper 
            label="Шаги" icon={Footprints} unit="шагов" step={500}
            value={lifestyle.steps} colorClass="text-orange-500"
            onChange={(val) => setLifestyle({...lifestyle, steps: val})}
          />
          <Stepper 
            label="Сон" icon={Moon} unit="часов" step={0.5}
            value={lifestyle.sleep} colorClass="text-indigo-500"
            onChange={(val) => setLifestyle({...lifestyle, sleep: val})}
          />
        </div>

        {/* Счетчик воды */}
        <Card className="p-5 mb-4 relative overflow-hidden">
             <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-blue-50 to-transparent"></div>
             <div className="flex justify-between items-center mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-xl text-blue-500"><Droplet size={20}/></div>
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block">Вода</span>
                        <span className="text-xl font-bold text-slate-800">{lifestyle.water || 0} <span className="text-sm font-normal text-slate-400">мл</span></span>
                    </div>
                </div>
             </div>
             <div className="flex gap-2 relative z-10">
                  {[250, 500].map(vol => (
                    <button 
                      key={vol}
                      onClick={() => setLifestyle({ ...lifestyle, water: (lifestyle.water || 0) + vol })} 
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold py-3 rounded-xl transition-colors active:scale-95"
                    >
                      +{vol}
                    </button>
                  ))}
                  <button 
                    onClick={() => setLifestyle({ ...lifestyle, water: 0 })}
                    className="w-12 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:text-red-500"
                  >
                    <RefreshCw size={18}/>
                  </button>
             </div>
        </Card>

        {/* Стресс */}
        <Card className="p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
                <Brain size={18} className="text-rose-500" />
                <span className="text-xs font-bold text-slate-500 uppercase">Уровень стресса</span>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              {['Низкий', 'Средний', 'Высокий'].map((level, idx) => (
                <button
                  key={idx} onClick={() => setLifestyle({...lifestyle, stress: idx})}
                  className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${lifestyle.stress === idx ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {level}
                </button>
              ))}
            </div>
        </Card>

        <button 
          onClick={handleManualSave}
          disabled={saveStatus === 'loading' || saveStatus === 'success'}
          className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all flex justify-center items-center gap-2 active:scale-95 ${
            saveStatus === 'success' ? 'bg-green-500 text-white' :
            saveStatus === 'error' ? 'bg-red-500 text-white' :
            'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          {saveStatus === 'loading' ? <Loader2 size={20} className="animate-spin" /> : 
           saveStatus === 'success' ? <><Check size={20} /> Сохранено</> :
           saveStatus === 'error' ? <><AlertCircle size={20} /> Ошибка</> :
           <><Save size={20} /> Сохранить прогресс</>}
        </button>
      </section>
    </div>
  );
};

const ResultsScreen = ({ user, metrics, lifestyle, foodLog, date }) => {
  const [viewMode, setViewMode] = useState('day'); 
  const [range, setRange] = useState(7);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [aiPlan, setAiPlan] = useState(null);
  const [dynamicsResult, setDynamicsResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAskAI = async () => {
    setIsLoading(true);
    const context = { metrics, lifestyle, foodLog: foodLog.map(f => `${f.name} (${f.grams}г)`).join(", ") };
    const prompt = `
      Ты эксперт по диабету. Анализ дня (${date}): ${JSON.stringify(context)}.
      Метрики: GL_day, CQI, MR-Index.
      Дай JSON: { "summary": "Фраза", "factors": ["Фактор1", "Фактор2"], "advice": "Рекомендация" }.
      На русском. Без диагнозов.
    `;
    const result = await callGeminiAPI(prompt, true);
    setAiExplanation(result || { summary: "Ошибка AI", factors: [], advice: "Проверьте API-ключ в базе данных" });
    setIsLoading(false);
  };

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    const prompt = `
      На основе MR-Index: ${metrics.mrIndex} и стресса: ${lifestyle.stress}, составь план на ЗАВТРА.
      Верни JSON: { "breakfast": "Идея для завтрака, обеда и ужина (по одному предложению)", "habit": "Одна полезная привычка (одно предложение)" }.
      Строго без эмодзи.
    `;
    const result = await callGeminiAPI(prompt, true);
    if (result && result.breakfast) setAiPlan(result);
    else setAiPlan({ breakfast: "Не удалось создать план", habit: "Проверьте API-ключ в базе данных" });
    setIsLoading(false);
  };

  const handleAnalyzeDynamics = async () => {
    setIsLoading(true);
    setDynamicsResult(null);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - range);
    
    const { data: history, error } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (!history || history.length < 2) {
      setDynamicsResult({ error: "Недостаточно данных для анализа. Заполните дневник за несколько дней." });
      setIsLoading(false);
      return;
    }

    const prompt = `
      Проанализируй тренд здоровья за ${range} дней.
      История: ${JSON.stringify(history)}.
      Поля: mr_index (Риск), steps (Шаги), sleep (Сон).
      Верни JSON: { "trend": "Описание тренда (улучшение/ухудшение)", "key_insight": "Главный инсайт", "strategy": "Стратегия на неделю" }.
    `;
    const result = await callGeminiAPI(prompt, true);
    if(result) {
        setDynamicsResult(result);
    } else {
        setDynamicsResult({ error: "Ошибка соединения с ИИ. Проверьте настройки API ключа." });
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Tab Switcher */}
      <div className="bg-slate-100 p-1 rounded-2xl flex mb-6">
        <button onClick={() => setViewMode('day')} className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${viewMode === 'day' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Сегодня</button>
        <button onClick={() => setViewMode('dynamics')} className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${viewMode === 'dynamics' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Динамика</button>
      </div>

      {viewMode === 'day' ? (
        <>
          {/* Main Score Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden mb-6">
             <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
             <div className="relative z-10 flex flex-col items-center py-4">
                 <span className="text-slate-400 text-sm font-medium tracking-widest uppercase mb-2">MR-Index Риска</span>
                 <div className="text-6xl font-bold tracking-tighter mb-1">{metrics.mrIndex.toFixed(0)}</div>
                 <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs text-slate-300 backdrop-blur-sm">
                    <Info size={12} />
                    <span>Чем меньше, тем лучше</span>
                 </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard title="GL Day" value={metrics.glDay} max={150} color={metrics.glDay > 100 ? "text-rose-500" : metrics.glDay > 60 ? "text-orange-500" : "text-emerald-500"} description="Нагрузка" icon={<Activity size={18}/>} />
            <MetricCard title="CQI Score" value={metrics.cqi} max={100} color={metrics.cqi < 50 ? "text-rose-500" : metrics.cqi < 80 ? "text-orange-500" : "text-emerald-500"} description="Качество" icon={<Leaf size={18}/>} />
          </div>

          <section className="mt-6">
              <div className="flex items-center gap-2 mb-4 px-2">
                <div className="bg-violet-100 p-1.5 rounded-lg"><Brain size={18} className="text-violet-600" /></div>
                <h2 className="text-lg font-bold text-slate-800">AI Анализ</h2>
              </div>
              
              {!aiExplanation && !isLoading && (
                <button onClick={handleAskAI} className="w-full bg-white border-2 border-dashed border-violet-200 text-violet-600 font-semibold py-4 rounded-2xl hover:bg-violet-50 transition flex justify-center items-center gap-2">
                  <Sparkles size={18} /> Что повлияло сегодня?
                </button>
              )}
              
              {isLoading && (
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-slate-400 gap-3">
                      <Loader2 className="animate-spin text-violet-500" size={30}/> 
                      <span className="text-sm">Анализируем данные...</span>
                  </div>
              )}

              {aiExplanation && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-violet-100 animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-indigo-500"></div>
                  
                  <h3 className="font-bold text-slate-800 mb-3 text-lg leading-tight">{aiExplanation.summary}</h3>
                  <div className="space-y-3 mb-6">
                      {aiExplanation.factors.map((f, i) => (
                          <div key={i} className="flex items-start gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0"></span>
                              {f}
                          </div>
                      ))}
                  </div>
                  
                  <div className="bg-violet-50 p-4 rounded-2xl border border-violet-100">
                      <div className="flex items-center gap-2 mb-2">
                          <Sparkles size={16} className="text-violet-600"/>
                          <span className="text-xs font-bold text-violet-700 uppercase">Совет</span>
                      </div>
                      <p className="text-sm text-violet-900 leading-relaxed">{aiExplanation.advice}</p>
                  </div>
                  
                  {!aiPlan && !isLoading && (
                     <button onClick={handleGeneratePlan} className="w-full mt-4 text-sm font-semibold text-white bg-slate-900 py-3 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2">
                         Составить план на завтра <ChevronRight size={16}/>
                     </button>
                  )}

                  {aiPlan && (
                    <div className="mt-6 pt-6 border-t border-slate-100 animate-in slide-in-from-top-2">
                      <div className="mb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Рацион завтра</span>
                          <div className="bg-white border border-slate-200 p-4 rounded-2xl text-sm text-slate-700 shadow-sm">
                              {aiPlan.breakfast}
                          </div>
                      </div>
                      <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Привычка</span>
                          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl text-sm text-indigo-900 flex items-start gap-2">
                              <Check size={16} className="mt-0.5 shrink-0"/> {aiPlan.habit}
                          </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
          </section>
        </>
      ) : (
        <div className="animate-in fade-in">
           <Card className="p-6 mb-6">
             <h3 className="text-slate-800 font-bold mb-2 flex items-center gap-2"><TrendingUp size={20} className="text-blue-500"/> Анализ периода</h3>
             <p className="text-sm text-slate-500 mb-6">Выберите период для поиска закономерностей.</p>
             <div className="flex gap-2 mb-6">
               {[3, 7, 14, 30].map(d => (
                 <button key={d} onClick={() => setRange(d)} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${range === d ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>{d} дн</button>
               ))}
             </div>
             <ButtonPrimary onClick={handleAnalyzeDynamics} isLoading={isLoading}>
                Анализировать тренд
             </ButtonPrimary>
           </Card>

           {dynamicsResult && (
             <Card className="p-6 border-blue-100 animate-in slide-in-from-bottom-4">
               {dynamicsResult.error ? (
                 <div className="flex flex-col items-center py-6 text-slate-400">
                    <AlertCircle size={32} className="mb-2 opacity-50"/>
                    <p className="text-center text-sm">{dynamicsResult.error}</p>
                 </div>
               ) : (
                 <>
                   <p className="font-bold text-slate-800 text-xl mb-4 leading-tight">{dynamicsResult.trend}</p>
                   <div className="bg-blue-50 p-4 rounded-2xl mb-5 border border-blue-100">
                     <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">Инсайт</p>
                     <p className="text-sm text-blue-900 leading-relaxed font-medium">{dynamicsResult.key_insight}</p>
                   </div>
                   <div>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Стратегия</p>
                     <p className="text-sm text-slate-600 leading-relaxed">{dynamicsResult.strategy}</p>
                   </div>
                 </>
               )}
             </Card>
           )}
        </div>
      )}
    </div>
  );
};

// --- MAIN LAYOUT ---

export default function App() {
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('today');
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [isSupabaseReady, setSupabaseReady] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  
  const [foodLog, setFoodLog] = useState([]);
  const [lifestyle, setLifestyle] = useState({ steps: 0, sleep: 7, stress: 0, water: 0 });
  const [isSaving, setIsSaving] = useState(false);

  // Подключение Supabase и загрузка конфига ИИ
  useEffect(() => {
    // ВОССТАНОВЛЕНИЕ СЕССИИ
    const savedSession = localStorage.getItem('glucosafe_session');
    if (savedSession) {
      try {
        setUser(JSON.parse(savedSession));
      } catch (e) {}
    }

    const initDatabase = async () => {
        let sb = null;
        if (window.supabase) {
            sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        } else {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
                script.onload = resolve;
                document.head.appendChild(script);
            });
            sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }
        
        supabase = sb;
        
        // Как только база подключилась, скачиваем ключ и название модели
        const { data } = await supabase.from('app_config').select('*').eq('id', 1).single();
        if (data) {
            apiConfig.key = data.gemini_key;
            apiConfig.model = data.model_version;
        }

        setSupabaseReady(true);
    };

    initDatabase();
  }, []);

  useEffect(() => {
    if (!user || !isSupabaseReady) return;
    const loadData = async () => {
      const { data: stats } = await supabase.from('daily_stats').select('*').eq('user_id', user.id).eq('date', selectedDate).maybeSingle();
      if (stats) setLifestyle({ steps: stats.steps, sleep: stats.sleep, stress: stats.stress, water: stats.water || 0 });
      else setLifestyle({ steps: 0, sleep: 7, stress: 0, water: 0 });

      const { data: food } = await supabase.from('food_items').select('*').eq('user_id', user.id).eq('date', selectedDate);
      setFoodLog(food || []);
    };
    loadData();
  }, [user, selectedDate, isSupabaseReady]);

  const saveData = async (newFoodLog = foodLog, newLifestyle = lifestyle) => {
    if (!user) return false;
    setIsSaving(true);
    try {
        const metrics = calculateMetrics(newFoodLog, newLifestyle);
        const { error } = await supabase.from('daily_stats').upsert({
          user_id: user.id, date: selectedDate,
          ...newLifestyle, mr_index: metrics.mrIndex
        }, { onConflict: 'user_id, date' });
        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Save Error:", e);
        return false;
    } finally {
        setIsSaving(false);
    }
  };

  const addSmartItems = async (items) => {
    const newItems = items.map(item => {
      const gl = (item.gi * item.carbs) / 100;
      return {
        user_id: user.id, date: selectedDate,
        name: item.name, grams: item.portion_grams,
        carbs: item.carbs, sugar: item.sugar, fiber: item.fiber, gi: item.gi, gl: gl
      };
    });
    const { data, error } = await supabase.from('food_items').insert(newItems).select();
    if (!error && data) {
      const updatedLog = [...foodLog, ...data];
      setFoodLog(updatedLog);
      saveData(updatedLog, lifestyle);
    }
  };

  const removeFood = async (id) => {
    await supabase.from('food_items').delete().eq('id', id);
    const updatedLog = foodLog.filter(i => i.id !== id);
    setFoodLog(updatedLog);
    saveData(updatedLog, lifestyle);
  };

  const updateFood = async (updatedItem) => {
    const updatedLog = foodLog.map(item => item.id === updatedItem.id ? updatedItem : item);
    setFoodLog(updatedLog);
    await supabase.from('food_items').update({
        grams: updatedItem.grams, carbs: updatedItem.carbs, sugar: updatedItem.sugar, fiber: updatedItem.fiber, gl: updatedItem.gl
    }).eq('id', updatedItem.id);
    saveData(updatedLog, lifestyle);
  };

  const updateLifestyleLocal = (newVals) => {
    setLifestyle({ ...lifestyle, ...newVals });
  };

  const handleSaveLifestyle = async () => {
    return await saveData(foodLog, lifestyle);
  };

  const calculateMetrics = (log, life) => {
    let glSum = 0, totalCarbs = 0, totalFiber = 0, totalSugar = 0;
    log.forEach(item => {
      glSum += (item.gl || 0);
      totalCarbs += Number(item.carbs || 0);
      totalFiber += Number(item.fiber || 0);
      totalSugar += Number(item.sugar || 0);
    });

    let cqi = 50;
    if (totalCarbs > 0) {
      cqi = 50 + ((totalFiber / totalCarbs) * 100 * 2) - ((totalSugar / totalCarbs) * 100 * 0.5);
    }
    cqi = Math.max(0, Math.min(100, cqi));

    let mr = (glSum / 150) * 40 + (100 - cqi) * 0.2;
    if (life.steps < 5000) mr += 15;
    if (life.sleep < 7) mr += 10;
    if (life.stress > 0) mr += (life.stress * 10);
    if (life.water && life.water > 1500) mr -= 5;

    return { glDay: glSum, cqi, mrIndex: Math.max(0, Math.round(Math.min(100, mr))) };
  };

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('glucosafe_session', JSON.stringify(userData));
  };

  if (!isSupabaseReady) {
      return <div className="min-h-[100dvh] flex items-center justify-center text-slate-400 bg-slate-50"><Loader2 className="animate-spin mr-2"/> Загрузка...</div>;
  }

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  const metrics = calculateMetrics(foodLog, lifestyle);

  return (
    <div className="min-h-[100dvh] bg-slate-100 flex justify-center font-sans text-slate-900">
      
      {/* Модальное окно авторов (вставлено сюда) */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      {/* Mobile Frame Container */}
      <div className="w-full max-w-md bg-slate-50 sm:shadow-2xl sm:my-4 sm:rounded-[2.5rem] relative flex flex-col overflow-hidden h-[100dvh] sm:h-[90vh]">
        
        {/* HEADER */}
        <header className="px-6 pt-8 pb-4 z-10 sticky top-0 bg-slate-50/80 backdrop-blur-md flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <Activity size={16}/>
                </div>
                <h1 className="text-lg font-bold text-slate-800">GlucoSafe</h1>
                {/* Кнопка Info теперь здесь, рядом с заголовком */}
                <button 
                    onClick={() => setIsAboutOpen(true)} 
                    className="ml-1 p-1.5 bg-violet-100/50 text-violet-600 rounded-full hover:bg-violet-200 transition-colors"
                    title="О проекте"
                >
                  <Info size={16} />
                </button>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
               <input 
                 type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                 className="text-xs font-semibold text-slate-500 bg-transparent outline-none cursor-pointer"
               />
               {isSaving && <RefreshCw size={10} className="animate-spin text-slate-400"/>}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
                onClick={() => {
                  setUser(null);
                  localStorage.removeItem('glucosafe_session');
                }} 
                className="p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-red-500 transition-colors"
                title="Выйти"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 px-4 overflow-y-auto pb-6 scroll-smooth">
          {currentScreen === 'today' ? (
            <TodayScreen 
              log={foodLog} lifestyle={lifestyle} setLifestyle={updateLifestyleLocal}
              onRemoveFood={removeFood} onUpdateFood={updateFood} onSaveLifestyle={handleSaveLifestyle}
              onSmartAdd={addSmartItems} isSaving={isSaving}
            />
          ) : (
            <ResultsScreen user={user} metrics={metrics} lifestyle={lifestyle} foodLog={foodLog} date={selectedDate} />
          )}
        </main>

        {/* FLOATING NAVIGATION */}
        <div className="absolute bottom-10 left-0 w-full px-6 pointer-events-none z-20">
            <nav className="bg-white/90 backdrop-blur-xl border border-white/20 p-2 rounded-3xl flex justify-around items-center shadow-[0_8px_30px_rgb(0,0,0,0.08)] pointer-events-auto max-w-[300px] mx-auto">
                <button 
                    onClick={() => setCurrentScreen('today')} 
                    className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${currentScreen === 'today' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <Home size={22} />
                </button>
                <div className="w-px h-6 bg-slate-200 mx-2"></div>
                <button 
                    onClick={() => setCurrentScreen('results')} 
                    className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${currentScreen === 'results' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    <Activity size={22} />
                </button>
            </nav>
        </div>
      </div>
    </div>
  );
}