import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Sparkles, Wand2, Download, RefreshCw, Type, AlertCircle, Heading, RotateCcw } from 'lucide-react';
import { generateVisualDescription, generateImageFromPrompt, editImageWithPrompt } from './services/gemini';
import { Button } from './components/Button';

// Types defined locally as they are specific to the App logic
interface AppState {
  status: 'idle' | 'analyzing' | 'generating' | 'editing' | 'complete' | 'error';
  errorMessage: string | null;
  blogTitle: string;
  blogContent: string;
  currentImage: string | null;
  generatedPrompt: string | null;
  history: string[]; // Stores base64 images history
}

function App() {
  const [state, setState] = useState<AppState>({
    status: 'idle',
    errorMessage: null,
    blogTitle: '',
    blogContent: '',
    currentImage: null,
    generatedPrompt: null,
    history: [],
  });

  const [editInput, setEditInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to result only on mobile when image is generated
  useEffect(() => {
    if (state.currentImage && state.status === 'complete' && window.innerWidth < 1024) {
      const element = document.getElementById('result-section');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.currentImage, state.status]);

  const handleGenerate = async () => {
    if (!state.blogContent.trim() && !state.blogTitle.trim()) {
      setState(prev => ({ ...prev, errorMessage: "블로그 제목이나 내용을 입력해주세요." }));
      return;
    }

    setState(prev => ({ ...prev, status: 'analyzing', errorMessage: null }));

    try {
      // Step 1: Analyze text (Title + Content) to get a prompt
      const visualPrompt = await generateVisualDescription(state.blogTitle, state.blogContent);
      setState(prev => ({ 
        ...prev, 
        generatedPrompt: visualPrompt,
        status: 'generating' 
      }));

      // Step 2: Generate the image
      const base64Image = await generateImageFromPrompt(visualPrompt);
      
      setState(prev => ({
        ...prev,
        status: 'complete',
        currentImage: base64Image,
        history: [base64Image, ...prev.history]
      }));

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        errorMessage: error instanceof Error ? error.message : "예기치 않은 오류가 발생했습니다." 
      }));
    }
  };

  const handleEdit = async () => {
    if (!state.currentImage || !editInput.trim()) return;

    setState(prev => ({ ...prev, status: 'editing', errorMessage: null }));

    try {
      const newImage = await editImageWithPrompt(state.currentImage, editInput);
      
      setState(prev => ({
        ...prev,
        status: 'complete',
        currentImage: newImage,
        history: [newImage, ...prev.history]
      }));
      setEditInput(''); // Clear input after success

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        errorMessage: error instanceof Error ? error.message : "이미지 편집에 실패했습니다." 
      }));
    }
  };

  const handleDownload = () => {
    if (state.currentImage) {
      const link = document.createElement('a');
      link.href = state.currentImage;
      link.download = 'blog-visual-16x9.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRestoreHistory = (img: string) => {
    setState(prev => ({ ...prev, currentImage: img }));
  };

  const handleReset = () => {
    if (state.blogTitle || state.blogContent || state.currentImage) {
      if (!window.confirm('작성 중인 내용과 생성된 이미지가 모두 삭제됩니다. 초기화하시겠습니까?')) {
        return;
      }
    }
    
    setState({
      status: 'idle',
      errorMessage: null,
      blogTitle: '',
      blogContent: '',
      currentImage: null,
      generatedPrompt: null,
      history: [],
    });
    setEditInput('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
              <Sparkles size={18} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 hidden sm:block">나노 블로그 비주얼라이저</h1>
            <h1 className="text-xl font-bold text-slate-800 sm:hidden">블로그 비주얼라이저</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500 font-medium border border-slate-200 px-2 py-1 rounded hidden md:block">
              Gemini 2.5 Flash Image (16:9)
            </div>
            <Button 
              variant="outline" 
              onClick={handleReset} 
              icon={<RotateCcw size={14} />}
              className="px-3 py-1.5 text-sm border-slate-300 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
            >
              초기화
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 gap-8 grid grid-cols-1 lg:grid-cols-2 items-start">
        
        {/* Left Column: Inputs */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full min-h-[70vh]">
            
            {/* Title Input */}
            <div className="mb-6">
              <label htmlFor="blog-title" className="flex items-center space-x-2 text-sm font-semibold text-slate-700 mb-2">
                <Heading size={16} className="text-indigo-500" />
                <span>블로그 제목</span>
              </label>
              <input
                type="text"
                id="blog-title"
                value={state.blogTitle}
                onChange={(e) => setState(prev => ({ ...prev, blogTitle: e.target.value }))}
                placeholder="예: 2025년 웹 디자인 트렌드 완벽 가이드"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all text-lg font-medium"
              />
            </div>

            {/* Content Input */}
            <label htmlFor="blog-content" className="flex items-center space-x-2 text-sm font-semibold text-slate-700 mb-3">
              <Type size={16} className="text-indigo-500" />
              <span>블로그 본문</span>
            </label>
            <div className="relative flex-1 flex flex-col">
              <textarea
                id="blog-content"
                ref={textareaRef}
                value={state.blogContent}
                onChange={(e) => setState(prev => ({ ...prev, blogContent: e.target.value }))}
                placeholder="블로그 게시물의 전체 본문을 여기에 붙여넣으세요. AI가 제목과 내용을 분석하여 가장 어울리는 16:9 커버 이미지를 생성합니다..."
                className="flex-1 w-full p-5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all resize-none text-base leading-relaxed"
              />
            </div>
            
            <div className="mt-4 flex justify-between items-center border-t border-slate-100 pt-4">
               <span className="text-xs text-slate-400">
                 본문 {state.blogContent.length} 자
               </span>
               <Button 
                 onClick={handleGenerate} 
                 isLoading={state.status === 'analyzing' || state.status === 'generating'}
                 disabled={!state.blogTitle && state.blogContent.length < 10}
                 icon={<Wand2 size={16} />}
                 className="px-8"
               >
                 {state.status === 'analyzing' ? '내용 분석 중...' : state.status === 'generating' ? '이미지 생성 중...' : '대표 이미지 생성하기'}
               </Button>
            </div>
          </div>

          {/* Error Message */}
          {state.errorMessage && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-start gap-3">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm">{state.errorMessage}</p>
            </div>
          )}
        </div>

        {/* Right Column: Visualization (Sticky) */}
        <div className="lg:sticky lg:top-24 flex flex-col gap-6" id="result-section">
          
          {/* Prompt Display (Compact) */}
          {state.generatedPrompt && (
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 animate-fade-in">
              <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">생성된 프롬프트</h3>
              <p className="text-sm text-indigo-900 italic line-clamp-3 hover:line-clamp-none transition-all cursor-default">"{state.generatedPrompt}"</p>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <ImageIcon size={18} className="text-teal-600" />
                미리보기 (16:9)
              </h2>
              {state.currentImage && (
                <button 
                  onClick={handleDownload}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                  title="이미지 다운로드"
                >
                  <Download size={18} />
                </button>
              )}
            </div>

            {/* Image Canvas Area - Enforced 16:9 Aspect Ratio */}
            <div className="w-full aspect-video bg-slate-100 relative flex items-center justify-center overflow-hidden">
              {state.status === 'generating' || state.status === 'analyzing' || state.status === 'editing' ? (
                <div className="text-center space-y-4 animate-pulse px-4">
                  <div className="w-16 h-16 mx-auto bg-indigo-200 rounded-full flex items-center justify-center">
                     <Sparkles className="text-indigo-600 animate-spin" size={24} />
                  </div>
                  <p className="text-slate-500 font-medium">
                    {state.status === 'analyzing' ? '블로그 맥락 파악 중...' : 
                     state.status === 'generating' ? '16:9 아트워크 렌더링 중...' :
                     '이미지 수정 중...'}
                  </p>
                </div>
              ) : state.currentImage ? (
                <div className="relative group w-full h-full">
                  <img 
                    src={state.currentImage} 
                    alt="Generated Blog Cover" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="text-center max-w-xs text-slate-400">
                  <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
                  <p>블로그 제목과 글을 입력하시면<br/>여기에 대표 이미지가 나타납니다.</p>
                </div>
              )}
            </div>

            {/* Edit / Refine Bar */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  추가 편집
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={editInput}
                    onChange={(e) => setEditInput(e.target.value)}
                    placeholder="예: '텍스트 제거', '더 밝게', '수채화 스타일로'"
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    disabled={!state.currentImage || state.status === 'editing'}
                    onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                  />
                  <Button 
                    variant="secondary" 
                    onClick={handleEdit}
                    disabled={!state.currentImage || !editInput.trim() || state.status === 'editing'}
                    isLoading={state.status === 'editing'}
                    icon={<RefreshCw size={16} />}
                  >
                    수정
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* History / Thumbnails */}
          {state.history.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
              {state.history.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleRestoreHistory(img)}
                  className={`shrink-0 w-24 aspect-video rounded-lg overflow-hidden border-2 transition-all ${state.currentImage === img ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 opacity-70 hover:opacity-100'}`}
                >
                  <img src={img} alt={`히스토리 ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;