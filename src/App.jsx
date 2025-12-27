import React, { useState, useEffect } from 'react';
import { ChevronDown, Upload, Trash2, CheckCircle, Circle, FolderOpen, Plus, X } from 'lucide-react';

const API_URL = 'http://localhost:3005/api';

export default function PortfolioManager() {
  const [projects, setProjects] = useState([]);
  const [expandedProject, setExpandedProject] = useState(null);
  const [uploads, setUploads] = useState({});
  const [completedModules, setCompletedModules] = useState({});

  // Loading states
  const [isLoading, setIsLoading] = useState(true);

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, compRes, upRes] = await Promise.all([
          fetch(`${API_URL}/projects`),
          fetch(`${API_URL}/completed`),
          fetch(`${API_URL}/uploads`)
        ]);

        const projData = await projRes.json();
        const compData = await compRes.json();
        const upData = await upRes.json();

        setProjects(projData);
        setCompletedModules(compData);
        setUploads(upData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    type: 'REPORTE',
    area: 'Sistemas',
    modules: ''
  });

  const toggleProject = (id) => {
    setExpandedProject(expandedProject === id ? null : id);
  };

  const toggleModuleCompletion = async (moduleKey) => {
    // Optimistic Update
    setCompletedModules(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }));

    try {
      await fetch(`${API_URL}/completed/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleKey })
      });
    } catch (error) {
      console.error("Error toggling completion", error);
      // Revert if error
      setCompletedModules(prev => ({
        ...prev,
        [moduleKey]: !prev[moduleKey]
      }));
    }
  };

  const handleFileUpload = async (moduleKey, event) => {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('moduleKey', moduleKey);

      try {
        const res = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        setUploads(prev => ({
          ...prev,
          [moduleKey]: data.file
        }));
      } catch (error) {
        console.error("Error uploading file", error);
        alert("Error al subir archivo");
      }
    }
  };

  const deleteUpload = async (moduleKey) => {
    try {
      await fetch(`${API_URL}/upload/${moduleKey}`, {
        method: 'DELETE'
      });
      setUploads(prev => {
        const newUploads = { ...prev };
        delete newUploads[moduleKey];
        return newUploads;
      });
    } catch (error) {
      console.error("Error deleting file", error);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;

    const modulesList = newProject.modules
      .split('\n')
      .map(m => m.trim())
      .filter(m => m.length > 0);

    const projectData = {
      name: newProject.name,
      type: newProject.type,
      area: newProject.area,
      modules: modulesList
    };

    try {
      const res = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const savedProject = await res.json();

      setProjects(prev => [...prev, savedProject]);
      setNewProject({ name: '', type: 'REPORTE', area: 'Sistemas', modules: '' });
      setIsModalOpen(false);
      alert("Proyecto creado exitosamente");
    } catch (error) {
      console.error("Error creating project", error);
      alert(`Error al crear proyecto: ${error.message}\nAsegúrate de que 'npm run start' esté corriendo.`);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este proyecto?')) {
      try {
        await fetch(`${API_URL}/projects/${projectId}`, {
          method: 'DELETE'
        });
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } catch (error) {
        console.error("Failed to delete project", error);
      }
    }
  };

  const getModuleKey = (projectId, moduleName) => `${projectId}-${moduleName}`;
  const projectProgress = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return 0;
    if (project.modules.length === 0) return 100;
    const completed = project.modules.filter(m => completedModules[getModuleKey(projectId, m)]).length;
    return Math.round((completed / project.modules.length) * 100);
  };

  const totalProgress = () => {
    if (projects.length === 0) return 0;
    const allModules = projects.reduce((acc, p) => acc + (p.modules.length || 1), 0);
    const completed = Object.values(completedModules).filter(Boolean).length;
    return Math.round((completed / allModules) * 100);
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Cargando portafolio...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Gestor de Portafolio</h1>
              <p className="text-gray-600">Organiza y carga las pruebas de todos tus proyectos</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              <Plus size={20} />
              <span>Nuevo Proyecto</span>
            </button>
          </div>

          {/* Progress General */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Progreso General</span>
              <span className="text-lg font-bold text-indigo-600">{totalProgress()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-indigo-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${totalProgress()}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Proyectos */}
        <div className="space-y-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Project Header */}
              <div
                className="w-full px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer"
                onClick={() => toggleProject(project.id)}
              >
                <div className="flex items-center gap-4 flex-1 text-left">
                  <ChevronDown
                    size={24}
                    className={`text-indigo-600 transition-transform ${expandedProject === project.id ? 'rotate-180' : ''}`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                        {project.type}
                      </span>
                      {project.area && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                          {project.area}
                        </span>
                      )}
                      <h2 className="text-lg font-semibold text-gray-800">{project.name}</h2>
                    </div>
                    <div className="text-sm text-gray-500">
                      {project.modules.length === 0 ? '1 elemento' : `${project.modules.length} módulos`}
                    </div>
                  </div>
                </div>

                {/* Mini Progress & Actions */}
                <div className="flex items-center gap-4 ml-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${projectProgress(project.id)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-8 text-right">{projectProgress(project.id)}%</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                    className="p-2 text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedProject === project.id && (
                <div className="border-t bg-gray-50 p-6 space-y-4">
                  {(project.modules.length === 0 ? ['main'] : project.modules).map((moduleOrMain, idx) => {
                    const isMain = project.modules.length === 0;
                    // When it's main, we use the project name as the label in logic if needed, but UI shows project name
                    const moduleName = isMain ? project.name : moduleOrMain;
                    const moduleKey = getModuleKey(project.id, isMain ? 'main' : moduleOrMain);
                    const isCompleted = completedModules[moduleKey];
                    const uploadedFile = uploads[moduleKey];

                    return (
                      <div key={idx} className={`bg-white rounded-lg p-4 border ${isMain ? 'border-dashed border-gray-300' : 'border-gray-200'} hover:border-indigo-300 transition-colors`}>
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => toggleModuleCompletion(moduleKey)}
                              className="flex-shrink-0"
                            >
                              {isCompleted ? (
                                <CheckCircle size={24} className="text-green-500" />
                              ) : (
                                <Circle size={24} className="text-gray-400" />
                              )}
                            </button>

                            <div className="flex-1">
                              <p className={`font-medium ${isCompleted ? 'text-green-600 line-through' : 'text-gray-800'}`}>
                                {moduleName}
                              </p>
                            </div>

                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(moduleKey, e)}
                                className="hidden"
                              />
                              <div className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                <Upload size={18} />
                                <span className="text-sm font-medium">Subir</span>
                              </div>
                            </label>

                            {uploadedFile && (
                              <button
                                onClick={() => deleteUpload(moduleKey)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>

                          {/* Image Preview Area */}
                          {uploadedFile && (
                            <div className="ml-10 bg-gray-50 p-2 rounded shadow-inner flex flex-col gap-2">
                              <span className="text-sm text-gray-600 truncate max-w-xs font-semibold">{uploadedFile.name}</span>
                              {uploadedFile.preview && (
                                <div className="mt-2">
                                  <img
                                    src={uploadedFile.preview}
                                    alt="Uploaded proof"
                                    className="max-h-64 rounded border border-gray-200 shadow-sm"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {projects.length === 0 && (
            <div className="text-center py-10 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <FolderOpen className="mx-auto text-gray-400 mb-2" size={48} />
              <p className="text-gray-500">No hay proyectos aún. ¡Crea el primero!</p>
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Resumen</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{projects.length}</div>
              <div className="text-sm text-gray-700">Proyectos</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{Object.values(completedModules).filter(Boolean).length}</div>
              <div className="text-sm text-gray-700">Completados</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
              <div className="text-3xl font-bold text-indigo-600">{Object.keys(uploads).length}</div>
              <div className="text-sm text-gray-700">Archivos</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">{totalProgress()}%</div>
              <div className="text-sm text-gray-700">Progreso</div>
            </div>
          </div>
        </div>

        {/* Modal Crear Proyecto */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="text-lg font-bold text-gray-800">Nuevo Proyecto</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Proyecto</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Ej: Sistema de Inventario"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={newProject.type}
                    onChange={(e) => setNewProject({ ...newProject, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="REPORTE">REPORTE</option>
                    <option value="SISTEMA">SISTEMA</option>
                    <option value="WEB APP">WEB APP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
                  <select
                    value={newProject.area}
                    onChange={(e) => setNewProject({ ...newProject, area: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Sistemas">Sistemas</option>
                    <option value="Analistas">Analistas</option>
                    <option value="Soporte">Soporte</option>
                    <option value="Desarrollo">Desarrollo</option>
                    <option value="Auxiliares">Auxiliares</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Módulos (uno por línea)</label>
                  <textarea
                    value={newProject.modules}
                    onChange={(e) => setNewProject({ ...newProject, modules: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none h-32"
                    placeholder="Módulo de Facturación&#10;Módulo de Usuarios&#10;..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Si lo dejas vacío, se creará como elemento único.</p>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProject.name.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Crear Proyecto
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
