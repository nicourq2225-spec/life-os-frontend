"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// CONEXIÓN A TU BACKEND
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const MAPA_CATEGORIAS = {
  "Vivienda": ["Alquiler", "Impuestos", "Wifi", "Telefono", "Limpieza", "Ropa"],
  "Alimentación": ["Supermercado", "Kiosco", "Comida"],
  "Salud y Bienestar": ["Seguros", "Psicologo", "Peluqueria"],
  "TUP": ["TUP"],
  "Entrenamiento": ["Gimnasio", "Personal Trainer"],
  "Logística/Moto": ["Moto", "Nafta", "Logistica"],
  "Social": ["Salir", "Mujeres", "Comer Afuera"],
  "Consumo": ["Compras", "Suscripciones"],
  "Vicios": ["Cigarillos", "Marihuana", "Alcohol", "Faso", "Puchos"],
  "Uber": ["Uber"],
  "Desconocido": ["Desconocido"]
};

const CAT_HABITOS = { "Salud": ["Entrenamiento", "Nutrición"], "Disciplina": ["Abstinencia", "Auditoría"], "Estudio": ["Estudio"] };
const DB_FIELDS_HABITOS = { "Entrenamiento": "fuerza", "Nutrición": "nutricion", "Abstinencia": "abstinencia", "Auditoría": "auditoria", "Estudio": "estudio" };

const obtenerFechaLocal = () => {
  const d = new Date();
  const anio = d.getFullYear(); 
  const mes = String(d.getMonth() + 1).padStart(2, '0'); 
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const formatearFechaTabla = (fechaCruda) => {
  if (!fechaCruda) return '';
  const soloFecha = fechaCruda.split('T')[0]; 
  const [anio, mes, dia] = soloFecha.split('-');
  return `${dia}/${mes}/${anio}`;
};

const calcularDiaCiclo = (fechaStr) => {
  const baseLocal = new Date("2026-06-15T00:00:00");
  const evaluarLocal = new Date(fechaStr + "T00:00:00");
  const diffDays = Math.floor((evaluarLocal - baseLocal) / (1000 * 60 * 60 * 24));
  let mod = diffDays % 21;
  if (mod < 0) mod += 21;
  return mod + 1; 
};

export default function Dashboard() {
  const [vistaActual, setVistaActual] = useState('dashboard');
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth());
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear());
  const [fechaDashboard, setFechaDashboard] = useState(obtenerFechaLocal());

  const [historialHabitos, setHistorialHabitos] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [resumenMes, setResumenMes] = useState({ ingresos: 0, necesarios: 0, innecesarios: 0 });
  const [motoData, setMotoData] = useState({ progreso: 0, actual: 0 });
  
  const [agendaCompleta, setAgendaCompleta] = useState([]);
  const [diaAgendaSeleccionado, setDiaAgendaSeleccionado] = useState(calcularDiaCiclo(obtenerFechaLocal()));
  const [modalAgendaAbierto, setModalAgendaAbierto] = useState(false);
  const [eventoEdit, setEventoEdit] = useState({ id: null, horaInicio: '08:00', horaFin: '09:00', titulo: '', tipo: 'Obligacion' });

  // ESTADOS PARA ESTUDIO Y RUTINA VISUAL
  const [estudioData, setEstudioData] = useState([]);
  const [modalEstudioAbierto, setModalEstudioAbierto] = useState(false);
  const [formEstudio, setFormEstudio] = useState({ id: null, fecha: obtenerFechaLocal(), materia: '', completado: false });
  const [modalRutinaAbierto, setModalRutinaAbierto] = useState(false); // <--- NUEVO ESTADO PARA LA IMAGEN

  const [modalAbierto, setModalAbierto] = useState(false);
  const [formId, setFormId] = useState(null); 
  const [formTipo, setFormTipo] = useState('Gasto'); 
  const [formSubTipo, setFormSubTipo] = useState('Necesario'); 
  const [formMonto, setFormMonto] = useState(''); 
  const [formCategoria, setFormCategoria] = useState('Alquiler'); 
  const [formAplicacion, setFormAplicacion] = useState('Efectivo'); 
  const [formFecha, setFormFecha] = useState(obtenerFechaLocal());

  const [modalHabitoManual, setModalHabitoManual] = useState(false);
  const [formHabitoManual, setFormHabitoManual] = useState({ id: null, fecha: obtenerFechaLocal(), Entrenamiento: 'descanso', Nutrición: 'descanso', Abstinencia: 'descanso', Auditoría: 'descanso', Estudio: 'descanso' });

  const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const cargarDatosGlobales = async () => {
    try {
      const resAgenda = await axios.get(`${API_URL}/api/agenda`);
      setAgendaCompleta(resAgenda.data || []);

      const resHabitosHist = await axios.get(`${API_URL}/api/habitos/historial?mes=${mesFiltro}&anio=${anioFiltro}`); 
      setHistorialHabitos(resHabitosHist.data || []);

      const resMoto = await axios.get(`${API_URL}/api/ahorro-moto`); 
      setMotoData({ progreso: resMoto.data.porcentajeProgreso, actual: resMoto.data.capitalActual });

      const resFinanzas = await axios.get(`${API_URL}/api/finanzas?mes=${mesFiltro}&anio=${anioFiltro}`); 
      setTransacciones(resFinanzas.data.transacciones || []); 
      setResumenMes(resFinanzas.data.resumen || { ingresos: 0, necesarios: 0, innecesarios: 0 });

      const resEstudio = await axios.get(`${API_URL}/api/estudio`);
      setEstudioData(resEstudio.data || []);
    } catch (error) { console.error("Error conectando al servidor:", error); }
  };

  useEffect(() => { cargarDatosGlobales(); }, [mesFiltro, anioFiltro, fechaDashboard]);

  const obtenerRequeridos = (fechaStr) => {
    const d = new Date(fechaStr + "T12:00:00");
    const diaSem = d.getDay(); 
    const requeridos = [];
    if (diaSem >= 1 && diaSem <= 5) requeridos.push('Nutrición', 'Abstinencia', 'Auditoría');
    if (diaSem === 1 || diaSem === 3 || diaSem === 5) requeridos.push('Entrenamiento');
    if (diaSem === 2 || diaSem === 4) requeridos.push('Estudio');
    return requeridos; 
  };

  const diaCicloHoy = calcularDiaCiclo(fechaDashboard);
  const agendaHoy = agendaCompleta.filter(e => e.diaCiclo === diaCicloHoy).sort((a,b) => a.horaInicio.localeCompare(b.horaInicio));
  const habitoDelDia = historialHabitos.find(h => h.fecha === fechaDashboard) || { fuerza: null, nutricion: null, abstinencia: null, auditoria: null, estudio: null };
  const requeridosHoy = obtenerRequeridos(fechaDashboard);
  
  const gastosHoy = transacciones.filter(t => t.tipo === 'Gasto' && t.fecha.split('T')[0] === fechaDashboard).reduce((acc, curr) => acc + parseFloat(curr.monto), 0);
  const temaDeHoy = estudioData.find(e => e.fecha === fechaDashboard);

  const toggleHabitoDashboard = async (campo) => {
    const valActual = habitoDelDia[campo];
    const nuevoVal = valActual === true ? false : true;
    try { 
      await axios.post(`${API_URL}/api/habitos`, { 
        fecha: fechaDashboard, fuerza: campo === 'fuerza' ? nuevoVal : habitoDelDia.fuerza, nutricion: campo === 'nutricion' ? nuevoVal : habitoDelDia.nutricion, abstinencia: campo === 'abstinencia' ? nuevoVal : habitoDelDia.abstinencia, auditoria: campo === 'auditoria' ? nuevoVal : habitoDelDia.auditoria, estudio: campo === 'estudio' ? nuevoVal : habitoDelDia.estudio 
      }); 
      cargarDatosGlobales(); 
    } catch (error) { console.error(error); } 
  };

  const abrirModalEstudio = (item = null) => { if (item) setFormEstudio({ id: item.id, fecha: item.fecha, materia: item.materia, completado: item.completado }); else setFormEstudio({ id: null, fecha: obtenerFechaLocal(), materia: '', completado: false }); setModalEstudioAbierto(true); };
  const guardarEstudio = async (e) => { e.preventDefault(); try { if (formEstudio.id) await axios.put(`${API_URL}/api/estudio/${formEstudio.id}`, formEstudio); else await axios.post(`${API_URL}/api/estudio`, formEstudio); setModalEstudioAbierto(false); cargarDatosGlobales(); } catch (err) { console.error(err); } };
  const borrarEstudio = async (id) => { if (window.confirm("¿Eliminar este tema?")) { try { await axios.delete(`${API_URL}/api/estudio/${id}`); cargarDatosGlobales(); } catch (err) { console.error(err); } } };
  const toggleCompletadoEstudio = async (item) => { try { await axios.put(`${API_URL}/api/estudio/${item.id}`, { ...item, completado: !item.completado }); cargarDatosGlobales(); } catch (err) { console.error(err); } };

  const mapDBtoForm = (val) => val === null ? 'descanso' : val === true ? 'cumplido' : 'nocumplido';
  const mapFormtoDB = (val) => val === 'descanso' ? null : val === 'cumplido' ? true : false;
  const abrirModalHabitoManual = (h = null) => { if (h) setFormHabitoManual({ id: h.id, fecha: h.fecha, Entrenamiento: mapDBtoForm(h.fuerza), Nutrición: mapDBtoForm(h.nutricion), Abstinencia: mapDBtoForm(h.abstinencia), Auditoría: mapDBtoForm(h.auditoria), Estudio: mapDBtoForm(h.estudio) }); else setFormHabitoManual({ id: null, fecha: obtenerFechaLocal(), Entrenamiento: 'descanso', Nutrición: 'descanso', Abstinencia: 'descanso', Auditoría: 'descanso', Estudio: 'descanso' }); setModalHabitoManual(true); };
  const handleFechaHabitoChange = (nuevaFecha) => { const record = historialHabitos.find(h => h.fecha === nuevaFecha) || {}; setFormHabitoManual({ id: record.id || null, fecha: nuevaFecha, Entrenamiento: mapDBtoForm(record.fuerza), Nutrición: mapDBtoForm(record.nutricion), Abstinencia: mapDBtoForm(record.abstinencia), Auditoría: mapDBtoForm(record.auditoria), Estudio: mapDBtoForm(record.estudio) }); };
  const manejarEnvioHabitoManual = async (e) => { e.preventDefault(); try { await axios.post(`${API_URL}/api/habitos`, { fecha: formHabitoManual.fecha, fuerza: mapFormtoDB(formHabitoManual.Entrenamiento), nutricion: mapFormtoDB(formHabitoManual.Nutrición), abstinencia: mapFormtoDB(formHabitoManual.Abstinencia), auditoria: mapFormtoDB(formHabitoManual.Auditoría), estudio: mapFormtoDB(formHabitoManual.Estudio) }); setModalHabitoManual(false); cargarDatosGlobales(); } catch (error) {} };
  const borrarHabitoManual = async (id) => { if (window.confirm("¿Seguro que deseas eliminar este registro?")) { try { await axios.delete(`${API_URL}/api/habitos/${id}`); cargarDatosGlobales(); } catch (error) {} } };

  const agendaFiltradaVista = agendaCompleta.filter(e => e.diaCiclo === diaAgendaSeleccionado).sort((a,b) => a.horaInicio.localeCompare(b.horaInicio));
  const abrirModalAgenda = (evento = null) => { if (evento) { setEventoEdit({ id: evento.id, horaInicio: evento.horaInicio, horaFin: evento.horaFin, titulo: evento.titulo, tipo: evento.tipo }); } else { setEventoEdit({ id: null, horaInicio: '08:00', horaFin: '09:00', titulo: '', tipo: 'Obligacion' }); } setModalAgendaAbierto(true); };
  const guardarEventoAgenda = async (e) => { e.preventDefault(); const payload = { ...eventoEdit, diaCiclo: diaAgendaSeleccionado }; try { if (eventoEdit.id) { await axios.put(`${API_URL}/api/agenda/${eventoEdit.id}`, payload); } else { await axios.post(`${API_URL}/api/agenda`, payload); } setModalAgendaAbierto(false); cargarDatosGlobales(); } catch (error) {} };
  const borrarEventoAgenda = async (id) => { if (window.confirm("¿Estás seguro de que quieres eliminar este evento?")) { try { await axios.delete(`${API_URL}/api/agenda/${id}`); cargarDatosGlobales(); } catch(e) {} } };

  const abrirFormularioNuevo = (tipo = 'Gasto', subTipo = 'Necesario') => { setFormId(null); setFormTipo(tipo); setFormSubTipo(subTipo); setFormMonto(''); setFormCategoria('Alquiler'); setFormAplicacion(''); setFormFecha(obtenerFechaLocal()); setModalAbierto(true); };
  const abrirFormularioEdicion = (t) => { setFormId(t.id); setFormTipo(t.tipo); setFormSubTipo(t.categoria === 'Ingreso' ? 'Necesario' : t.categoria); setFormMonto(t.monto); setFormCategoria(t.categoriaFinanzas || 'Desconocido'); setFormAplicacion(t.aplicacion || ''); setFormFecha(t.fecha.split('T')[0]); setModalAbierto(true); };
  const manejarEliminar = async (id) => { if (window.confirm("¿Eliminar registro?")) { try { await axios.delete(`${API_URL}/api/finanzas/${id}`); cargarDatosGlobales(); } catch (error) {} } };
  const manejarEnvioFormulario = async (e) => { e.preventDefault(); if (!formMonto || parseFloat(formMonto) <= 0) return; const fechaSegura = formFecha.includes('T') ? formFecha : formFecha + 'T12:00:00'; const payload = { monto: formMonto, tipo: formTipo, subTipo: formSubTipo, categoriaFinanzas: formTipo === 'Ingreso' ? 'Ingreso' : formCategoria, aplicacion: formAplicacion || 'Efectivo', fecha: fechaSegura }; try { if (formId) await axios.put(`${API_URL}/api/finanzas/${formId}`, payload); else await axios.post(`${API_URL}/api/finanzas`, payload); setModalAbierto(false); cargarDatosGlobales(); } catch (error) {} };

  const formatearMoneda = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

  const procesarAuditoria = () => {
    const gastosAgrupados = {}; const gastosPorSub = {};
    Object.keys(MAPA_CATEGORIAS).forEach(cat => gastosAgrupados[cat] = 0);
    transacciones.forEach(t => {
      if (t.tipo === 'Gasto') {
        const subCat = t.categoriaFinanzas || 'Desconocido';
        gastosPorSub[subCat] = (gastosPorSub[subCat] || 0) + parseFloat(t.monto);
        let categoriaAsignada = "Desconocido";
        for (const [catMayor, subCats] of Object.entries(MAPA_CATEGORIAS)) { if (subCats.some(sc => sc.toLowerCase() === subCat.toLowerCase())) { categoriaAsignada = catMayor; break; } }
        gastosAgrupados[categoriaAsignada] += parseFloat(t.monto);
      }
    });
    const ranking = Object.entries(gastosAgrupados).map(([nombre, monto]) => ({ nombre, monto })).sort((a, b) => b.monto - a.monto);
    const rankingSub = Object.entries(gastosPorSub).map(([nombre, monto]) => ({ nombre, monto })).sort((a, b) => b.monto - a.monto);
    return { ranking, rankingSub, maxGastoCategoria: ranking.length > 0 ? ranking[0].monto : 0 };
  };

  const { ranking, rankingSub } = procesarAuditoria();
  const contadorCumplidosHoy = [habitoDelDia.fuerza, habitoDelDia.nutricion, habitoDelDia.abstinencia, habitoDelDia.auditoria, habitoDelDia.estudio].filter(v => v === true).length;
  const progresoHabitos = requeridosHoy.length === 0 ? 100 : Math.round((contadorCumplidosHoy / requeridosHoy.length) * 100);
  
  const totalGastosMes = resumenMes.necesarios + resumenMes.innecesarios;
  const restanteMes = resumenMes.ingresos - totalGastosMes;

  const renderBadge = (val) => {
    if (val === true) return <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-[10px] font-bold">CUMPLIDO</span>;
    if (val === false) return <span className="bg-rose-500/20 text-rose-400 px-2 py-1 rounded text-[10px] font-bold">NO CUMP</span>;
    return <span className="bg-stone-800 text-stone-400 px-2 py-1 rounded text-[10px] font-bold">DESCANSO</span>;
  };

  const procesarHabitosEstadisticas = () => {
    const stats = { mes: { Salud: { req: 0, cump: 0 }, Disciplina: { req: 0, cump: 0 }, Estudio: { req: 0, cump: 0 } }, semana: { Salud: { req: 0, cump: 0 }, Disciplina: { req: 0, cump: 0 }, Estudio: { req: 0, cump: 0 } } };
    const hoy = new Date(); const currentDay = hoy.getDay(); const diffToMonday = hoy.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const startOfWeek = new Date(hoy.getFullYear(), hoy.getMonth(), diffToMonday); startOfWeek.setHours(0,0,0,0);
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23,59,59,999);

    historialHabitos.forEach(record => {
      const fechaObj = new Date(record.fecha + "T12:00:00"); const reqsHistoricos = obtenerRequeridos(record.fecha); const esEstaSemana = fechaObj >= startOfWeek && fechaObj <= endOfWeek;
      Object.entries(CAT_HABITOS).forEach(([cat, subs]) => { subs.forEach(sub => { const esRequerido = reqsHistoricos.includes(sub); const fueCumplido = record[DB_FIELDS_HABITOS[sub]] === true; if (esRequerido) { stats.mes[cat].req++; if (fueCumplido) stats.mes[cat].cump++; if (esEstaSemana) { stats.semana[cat].req++; if (fueCumplido) stats.semana[cat].cump++; } } }); });
    });

    const getPct = (req, cump) => req === 0 ? 0 : Math.round((cump / req) * 100);
    return { mes: { Salud: getPct(stats.mes.Salud.req, stats.mes.Salud.cump), Disciplina: getPct(stats.mes.Disciplina.req, stats.mes.Disciplina.cump), Estudio: getPct(stats.mes.Estudio.req, stats.mes.Estudio.cump) }, semana: { Salud: getPct(stats.semana.Salud.req, stats.semana.Salud.cump), Disciplina: getPct(stats.semana.Disciplina.req, stats.semana.Disciplina.cump), Estudio: getPct(stats.semana.Estudio.req, stats.semana.Estudio.cump) } };
  };
  const pcts = procesarHabitosEstadisticas();

  return (
    <div className="min-h-screen p-4 md:p-12 font-sans bg-stone-950 text-stone-200 selection:bg-emerald-900 pb-24 md:pb-12 relative">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* NAVEGACIÓN DESKTOP */}
        <div className="hidden md:flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-stone-800 pb-4 gap-4">
          <div className="flex gap-6 overflow-x-auto w-full xl:w-auto scrollbar-hide">
            {['dashboard', 'finanzas', 'auditoria', 'estudio', 'habitos', 'agenda'].map((tab) => (
              <button 
                key={tab} onClick={() => setVistaActual(tab)} 
                className={`pb-3 text-sm font-medium whitespace-nowrap tracking-tight border-b-2 transition-all capitalize ${vistaActual === tab ? 'border-stone-200 text-stone-100 font-semibold' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
              >
                {tab === 'dashboard' ? 'Comando' : tab === 'finanzas' ? 'Finanzas' : tab === 'auditoria' ? 'Auditoría' : tab === 'estudio' ? 'Estudio' : tab === 'habitos' ? 'Hábitos' : 'Agenda'}
              </button>
            ))}
          </div>
          
          <div className="flex gap-4 items-center w-full xl:w-auto justify-end">
            <div className="flex gap-2 items-center bg-stone-900 px-3 py-2 rounded-xl border border-stone-800 shadow-sm">
              <select value={mesFiltro} onChange={(e) => setMesFiltro(parseInt(e.target.value))} className="text-xs bg-transparent border-none outline-none font-bold text-stone-300 cursor-pointer">
                {mesesNombres.map((n, i) => <option key={i} value={i}>{n}</option>)}
              </select>
              <span className="text-stone-600">/</span>
              <select value={anioFiltro} onChange={(e) => setAnioFiltro(parseInt(e.target.value))} className="text-xs bg-transparent border-none outline-none font-bold text-stone-300 cursor-pointer">
                <option value={2026}>2026</option><option value={2025}>2025</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModalRutinaAbierto(true)} className="bg-stone-900 text-stone-300 text-xs px-4 py-2.5 rounded-xl shadow-sm border border-stone-800 hover:bg-stone-800 transition font-bold whitespace-nowrap">🎯 Rutina</button>
              <button onClick={() => abrirModalHabitoManual(null)} className="bg-stone-800 text-stone-200 text-xs px-4 py-2.5 rounded-xl shadow-sm border border-stone-700 hover:bg-stone-700 transition font-bold whitespace-nowrap">✓ Registrar Día</button>
              <button onClick={() => abrirFormularioNuevo('Gasto', 'Necesario')} className="bg-stone-100 text-stone-950 text-xs px-4 py-2.5 rounded-xl shadow-sm hover:bg-white transition font-bold whitespace-nowrap">+ Transacción</button>
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN MÓVIL */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-stone-950/95 backdrop-blur-md border-t border-stone-800 flex justify-around items-center p-3 z-40 overflow-x-auto gap-4">
          {[
            { id: 'dashboard', icon: '⌂', label: 'Inicio' },
            { id: 'finanzas', icon: '$', label: 'Finanzas' },
            { id: 'auditoria', icon: '📊', label: 'Auditoría' },
            { id: 'estudio', icon: '📚', label: 'Estudio' },
            { id: 'habitos', icon: '✓', label: 'Hábitos' },
            { id: 'agenda', icon: '📅', label: 'Agenda' }
          ].map((tab) => (
            <button 
              key={tab.id} onClick={() => setVistaActual(tab.id)} 
              className={`flex flex-col items-center flex-shrink-0 gap-1 px-1 transition-all ${vistaActual === tab.id ? 'text-emerald-400' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* BOTONES FLOTANTES MÓVIL */}
        <div className="md:hidden fixed bottom-20 right-4 flex flex-col gap-3 z-40">
          <button onClick={() => setModalRutinaAbierto(true)} className="w-12 h-12 bg-stone-900 text-stone-300 rounded-full shadow-lg border border-stone-800 flex items-center justify-center text-xl font-bold">🎯</button>
          <button onClick={() => abrirModalHabitoManual(null)} className="w-12 h-12 bg-stone-800 text-white rounded-full shadow-lg border border-stone-700 flex items-center justify-center text-xl font-bold">✓</button>
          <button onClick={() => abrirFormularioNuevo('Gasto', 'Necesario')} className="w-12 h-12 bg-emerald-500 text-stone-950 rounded-full shadow-lg flex items-center justify-center text-2xl font-bold">+</button>
        </div>

        {/* --- VISTA: DASHBOARD --- */}
        {vistaActual === 'dashboard' && (
          <div className="space-y-6 md:space-y-10 animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-light tracking-tight text-stone-100">Centro de Comando</h1>
                <p className="text-stone-500 italic mt-1 text-xs">"La disciplina es el puente entre las metas y los logros."</p>
              </div>
              <div className="bg-stone-900 px-3 md:px-4 py-2 rounded-xl border border-stone-800 flex items-center gap-2 md:gap-3 w-full sm:w-auto">
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest whitespace-nowrap">Fecha:</span>
                <input type="date" value={fechaDashboard} onChange={(e) => setFechaDashboard(e.target.value)} className="bg-transparent text-sm font-bold text-stone-200 outline-none cursor-pointer [color-scheme:dark] w-full" />
              </div>
            </header>

            <section className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
              <div className="col-span-2 md:col-span-1 bg-stone-900 p-5 md:p-6 rounded-2xl shadow-lg border border-stone-800 flex flex-col justify-center">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2 md:mb-4">Energía / Hábitos</h2>
                <div className="text-3xl md:text-4xl font-light text-stone-100 mb-3">{progresoHabitos}%</div>
                <div className="w-full bg-stone-950 rounded-full h-1"><div className="bg-emerald-500 h-1 rounded-full transition-all duration-500" style={{ width: `${progresoHabitos}%` }}></div></div>
              </div>
              <div className="bg-stone-900 p-5 md:p-6 rounded-2xl shadow-lg border border-stone-800 flex flex-col justify-center">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-2 md:mb-4">Gastos del Día</h2>
                <div className="text-xl md:text-4xl font-light text-stone-100 truncate">{formatearMoneda(gastosHoy)}</div>
              </div>
              <div className="bg-stone-900 p-5 md:p-6 rounded-2xl shadow-lg border border-stone-800 flex flex-col justify-center">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2 md:mb-4">Progreso Moto</h2>
                <div className="text-xl md:text-4xl font-light text-stone-100 mb-2 truncate">{motoData.progreso}%</div>
                <div className="text-[9px] text-stone-500 truncate mb-3">{formatearMoneda(motoData.actual)}</div>
                <div className="w-full bg-stone-950 rounded-full h-1"><div className="bg-stone-400 h-1 rounded-full" style={{ width: `${motoData.progreso}%` }}></div></div>
              </div>
            </section>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
              <div className="lg:col-span-2 space-y-6 md:space-y-8">
                
                {requeridosHoy.includes('Estudio') && (
                  <div className="bg-gradient-to-r from-blue-900/40 to-stone-900 p-5 md:p-6 rounded-3xl border border-blue-900/50 shadow-lg flex items-center justify-between">
                    <div>
                      <h2 className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Materia a Estudiar Hoy (TUP)</h2>
                      {temaDeHoy ? (
                        <p className="text-xl font-bold text-stone-100">{temaDeHoy.materia}</p>
                      ) : (
                        <p className="text-sm font-medium text-stone-400 italic">No asignaste ninguna materia para hoy.</p>
                      )}
                    </div>
                    {temaDeHoy && (
                       <button onClick={() => toggleCompletadoEstudio(temaDeHoy)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${temaDeHoy.completado ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-stone-950 text-stone-400 border-stone-700 hover:border-stone-500'}`}>
                         {temaDeHoy.completado ? '✓ Completado' : 'Marcar Listo'}
                       </button>
                    )}
                  </div>
                )}

                <section className="bg-stone-900 p-5 md:p-8 rounded-3xl shadow-lg border border-stone-800">
                  <h2 className="text-sm md:text-base font-medium mb-4 md:mb-6 text-stone-100">Checklist Rápido ({formatearFechaTabla(fechaDashboard)})</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {[{ nombre: 'Entrenamiento', valor: habitoDelDia.fuerza, db: 'fuerza' }, { nombre: 'Nutrición', valor: habitoDelDia.nutricion, db: 'nutricion' }, { nombre: 'Abstinencia', valor: habitoDelDia.abstinencia, db: 'abstinencia' }, { nombre: 'Auditoría', valor: habitoDelDia.auditoria, db: 'auditoria' }, { nombre: 'Estudio', valor: habitoDelDia.estudio, db: 'estudio' }].map((pilar) => {
                      const requerido = requeridosHoy.includes(pilar.nombre);
                      return (
                        <button key={pilar.nombre} onClick={() => toggleHabitoDashboard(pilar.db)} disabled={!requerido} className={`flex items-center gap-3 p-3 md:p-4 border rounded-xl transition text-left ${!requerido ? 'bg-stone-950 opacity-50 cursor-not-allowed border-stone-900' : pilar.valor === true ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-stone-700 hover:bg-stone-800 text-stone-400'}`}>
                          <div className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center ${pilar.valor === true && requerido ? 'bg-emerald-500 border-emerald-500 text-stone-950' : 'border-stone-600'}`}>{pilar.valor === true && requerido && "✓"}</div>
                          <div>
                            <span className="text-xs md:text-sm font-bold block">{pilar.nombre}</span>
                            {!requerido && <span className="block text-[9px] font-normal text-stone-600 uppercase tracking-widest mt-0.5">Día de Descanso</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
              
              <div className="lg:col-span-1">
                <div className="bg-stone-900 p-5 md:p-8 rounded-3xl border border-stone-800 h-full shadow-lg">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-base font-medium text-stone-100">Agenda</h2>
                    <span className="text-[10px] bg-stone-800 text-stone-400 px-2 py-1 rounded font-bold uppercase">Día {diaCicloHoy}/21</span>
                  </div>
                  {agendaHoy.length === 0 ? (
                    <p className="text-sm text-stone-500 italic mt-10 text-center">Día libre. No hay eventos programados.</p>
                  ) : (
                    <div className="border-l-2 border-stone-700 ml-2 space-y-5 mt-4 pl-4 text-xs">
                      {agendaHoy.map(e => (
                        <div key={e.id} className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-stone-500 border-2 border-stone-900"></div>
                          <p className="text-stone-400 font-bold mb-0.5">{e.horaInicio} - {e.horaFin}</p>
                          <p className="font-medium text-stone-100 text-sm">{e.titulo}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- VISTA: ESTUDIO --- */}
        {vistaActual === 'estudio' && (
          <div className="space-y-6 animate-fade-in">
            <header className="flex justify-between items-end gap-4 border-b border-stone-800 pb-4">
              <div>
                <h1 className="text-2xl font-light tracking-tight text-stone-100">Planificador de TUP</h1>
                <p className="text-xs text-stone-500 mt-1">Organiza qué materia estudiar cada martes y jueves.</p>
              </div>
              <button onClick={() => abrirModalEstudio()} className="bg-stone-800 text-stone-100 text-xs px-4 py-2.5 rounded-xl border border-stone-700 font-bold hover:bg-stone-700 transition whitespace-nowrap">
                + Nuevo Tema
              </button>
            </header>

            <section className="bg-stone-900 rounded-3xl border border-stone-800 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-stone-950 text-stone-500 uppercase tracking-wider font-bold text-[9px]">
                    <tr><th className="p-4">Fecha</th><th className="p-4">Materia / Tema</th><th className="p-4 text-center">Estado</th><th className="p-4 text-center">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {estudioData.length === 0 ? (<tr><td colSpan="4" className="p-8 text-center text-stone-600 italic">No hay temas de estudio programados.</td></tr>) : (
                      estudioData.map((e) => (
                        <tr key={e.id} className="hover:bg-stone-800/50 transition">
                          <td className="p-4 text-stone-400 font-bold">{formatearFechaTabla(e.fecha)}</td>
                          <td className="p-4 font-bold text-stone-200 text-sm">{e.materia}</td>
                          <td className="p-4 text-center">
                            <button onClick={() => toggleCompletadoEstudio(e)} className={`px-2 py-1 rounded text-[10px] font-bold transition ${e.completado ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}>
                              {e.completado ? 'COMPLETADO' : 'PENDIENTE'}
                            </button>
                          </td>
                          <td className="p-4 text-center space-x-4">
                            <button onClick={() => abrirModalEstudio(e)} className="text-stone-500 hover:text-stone-200 transition font-bold text-xs">Editar</button>
                            <button onClick={() => borrarEstudio(e.id)} className="text-rose-500 hover:text-rose-400 transition font-bold text-xs">Borrar</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* --- VISTA: FINANZAS (Corregida y Proporcional) --- */}
        {vistaActual === 'finanzas' && (
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-light tracking-tight text-stone-100 border-b border-stone-800 pb-4">Finanzas</h1>
            
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800">
                <h3 className="text-[10px] font-bold text-stone-500 mb-1 uppercase tracking-widest">Ingresos Mes</h3>
                <div className="text-xl font-bold text-emerald-400">{formatearMoneda(resumenMes.ingresos)}</div>
              </div>
              <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800">
                <h3 className="text-[10px] font-bold text-stone-500 mb-1 uppercase tracking-widest">Gastos Totales</h3>
                <div className="text-xl font-bold text-rose-400">{formatearMoneda(totalGastosMes)}</div>
              </div>
              
              <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800">
                <h3 className="text-[10px] font-bold text-stone-500 mb-1 uppercase tracking-widest">Necesarios</h3>
                <div className="text-xl font-bold text-stone-300">{formatearMoneda(resumenMes.necesarios)}</div>
              </div>
              <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800">
                <h3 className="text-[10px] font-bold text-stone-500 mb-1 uppercase tracking-widest">Innecesarios</h3>
                <div className="text-xl font-bold text-rose-500">{formatearMoneda(resumenMes.innecesarios)}</div>
              </div>

              <div className="col-span-2 md:col-span-4 bg-stone-900 p-4 md:p-5 rounded-2xl border border-blue-900/50 bg-gradient-to-br from-stone-900 to-blue-900/20 flex flex-col md:flex-row md:items-center justify-between">
                <h3 className="text-[10px] font-bold text-blue-400 mb-1 md:mb-0 uppercase tracking-widest">Dinero Restante</h3>
                <div className={`text-2xl font-bold ${restanteMes < 0 ? 'text-rose-500' : 'text-blue-100'}`}>
                  {formatearMoneda(restanteMes)}
                </div>
              </div>
            </section>

            <section className="bg-stone-900 rounded-3xl border border-stone-800 overflow-hidden shadow-lg">
              <div className="p-4 border-b border-stone-800"><h3 className="text-sm font-medium text-stone-200">Historial</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-stone-950 text-stone-500 uppercase tracking-wider font-bold text-[9px]">
                    <tr><th className="p-4">Fecha</th><th className="p-4">Detalle</th><th className="p-4 text-right">Monto</th><th className="p-4 text-center">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {transacciones.map((t) => (
                      <tr key={t.id}>
                        <td className="p-4 text-stone-400">{formatearFechaTabla(t.fecha)}</td>
                        <td className="p-4"><p className="font-bold text-stone-200">{t.categoriaFinanzas}</p><p className="text-[9px] text-stone-500 uppercase tracking-widest mt-0.5">{t.tipo}</p></td>
                        <td className={`p-4 text-right font-bold text-sm ${t.tipo==='Ingreso'?'text-emerald-400':'text-stone-300'}`}>{t.tipo==='Ingreso'?'+':'-'}{formatearMoneda(t.monto)}</td>
                        <td className="p-4 text-center space-x-4"><button onClick={() => abrirFormularioEdicion(t)} className="text-stone-500 font-bold hover:text-stone-300">Editar</button><button onClick={() => manejarEliminar(t.id)} className="text-rose-500 font-bold hover:text-rose-400">Borrar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* --- VISTA: AUDITORÍA --- */}
        {vistaActual === 'auditoria' && (
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-light text-stone-100 border-b border-stone-800 pb-4">Auditoría</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <section className="bg-stone-900 rounded-3xl shadow-lg border border-stone-800 overflow-hidden h-fit">
                <div className="bg-stone-950 p-4 border-b border-stone-800">
                  <h2 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Pilares Oficiales</h2>
                </div>
                <div className="divide-y divide-stone-800">
                  {ranking.map((item) => (
                    <div key={item.nombre} className="p-4 px-5 flex justify-between items-center hover:bg-stone-800/50 transition">
                      <p className="text-sm font-bold text-stone-200">{item.nombre}</p>
                      <p className={`font-bold text-sm ${item.monto > 0 ? 'text-stone-100' : 'text-stone-600'}`}>{formatearMoneda(item.monto)}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-stone-900 rounded-3xl shadow-lg border border-stone-800 overflow-hidden h-fit">
                <div className="bg-stone-950 p-4 border-b border-stone-800">
                  <h2 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Detalle por Sub-Categoría</h2>
                </div>
                <div className="divide-y divide-stone-800 max-h-[500px] overflow-y-auto">
                  {rankingSub.length === 0 ? (
                    <p className="p-6 text-center text-xs text-stone-600 italic">No hay gastos para agrupar.</p>
                  ) : (
                    rankingSub.map((item) => (
                      <div key={item.nombre} className="p-3 px-5 flex justify-between items-center hover:bg-stone-800/50 transition">
                        <p className="text-xs font-bold text-stone-400">{item.nombre}</p>
                        <p className="font-bold text-xs text-stone-300">{formatearMoneda(item.monto)}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>

            </div>
          </div>
        )}

        {/* --- VISTA: AGENDA --- */}
        {vistaActual === 'agenda' && (
          <div className="space-y-6 animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <h1 className="text-2xl font-light tracking-tight text-stone-100">Línea de Tiempo</h1>
                <p className="text-xs text-stone-500 mt-1">Configura los eventos dentro de tus 21 días fijos.</p>
              </div>
              <button onClick={() => abrirModalAgenda()} className="w-full sm:w-auto bg-stone-800 text-stone-100 text-xs px-4 py-3 rounded-xl border border-stone-700 font-bold hover:bg-stone-700 transition">
                + Nuevo Evento
              </button>
            </header>
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {[...Array(21)].map((_, i) => (
                <button key={i+1} onClick={() => setDiaAgendaSeleccionado(i+1)} className={`snap-center flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition ${diaAgendaSeleccionado === i+1 ? 'bg-stone-200 text-stone-900' : 'bg-stone-900 text-stone-500 border border-stone-800'}`}>Día {i+1}</button>
              ))}
            </div>
            <section className="bg-stone-900 rounded-3xl border border-stone-800 shadow-lg p-4 md:p-6">
              <h2 className="text-sm font-medium text-stone-200 mb-4 border-b border-stone-800 pb-4">Eventos del Día {diaAgendaSeleccionado}</h2>
              <div className="space-y-3">
                {agendaFiltradaVista.length === 0 ? <p className="text-sm text-stone-500 italic">No hay eventos guardados en este día.</p> : agendaFiltradaVista.map(e => (
                  <div key={e.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-stone-950 p-4 rounded-xl border border-stone-800 gap-4">
                    <div className="flex items-center gap-4">
                      <span className="text-stone-400 font-mono text-xs md:text-sm w-24">{e.horaInicio} - {e.horaFin}</span>
                      <div><p className="text-stone-100 font-bold">{e.titulo}</p><p className="text-[9px] text-stone-600 uppercase tracking-widest mt-0.5">{e.tipo}</p></div>
                    </div>
                    <div className="space-x-4 self-end sm:self-auto">
                      <button onClick={() => abrirModalAgenda(e)} className="text-stone-500 hover:text-stone-200 font-bold text-xs transition">Editar</button>
                      <button onClick={() => borrarEventoAgenda(e.id)} className="text-rose-500 hover:text-rose-400 font-bold text-xs transition">Borrar</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* --- VISTA: HÁBITOS --- */}
        {vistaActual === 'habitos' && (
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-light text-stone-100 border-b border-stone-800 pb-4">Control Hábitos</h1>
            <div className="grid grid-cols-3 gap-3 md:gap-6">
              {['Salud', 'Disciplina', 'Estudio'].map(cat => (
                <div key={cat} className="bg-stone-900 p-4 md:p-6 rounded-2xl border border-stone-800"><h3 className="text-[9px] font-bold text-stone-500 mb-3 uppercase tracking-wider">{cat}</h3><div className="text-2xl md:text-3xl font-light text-emerald-400 mb-1">{pcts.mes[cat]}%</div><div className="w-full bg-stone-950 rounded-full h-1"><div className="bg-emerald-500 h-1 rounded-full" style={{width:`${pcts.mes[cat]}%`}}></div></div></div>
              ))}
            </div>
            <section className="bg-stone-900 rounded-3xl border border-stone-800 overflow-hidden shadow-lg">
              <div className="overflow-x-auto"><table className="w-full text-left text-xs whitespace-nowrap"><thead className="bg-stone-950 text-stone-500 uppercase tracking-wider font-bold text-[9px]"><tr><th className="p-4">Fecha</th><th className="p-4 text-center">Fuerza</th><th className="p-4 text-center">Nutri</th><th className="p-4 text-center">Abst</th><th className="p-4 text-center">Audit</th><th className="p-4 text-center">TUP</th><th className="p-4 text-center">Acciones</th></tr></thead><tbody className="divide-y divide-stone-800">{historialHabitos.map((h) => (<tr key={h.id}><td className="p-4 text-stone-400 font-bold">{formatearFechaTabla(h.fecha)}</td><td className="p-4 text-center">{renderBadge(h.fuerza)}</td><td className="p-4 text-center">{renderBadge(h.nutricion)}</td><td className="p-4 text-center">{renderBadge(h.abstinencia)}</td><td className="p-4 text-center">{renderBadge(h.auditoria)}</td><td className="p-4 text-center">{renderBadge(h.estudio)}</td><td className="p-4 text-center space-x-4"><button onClick={() => abrirModalHabitoManual(h)} className="text-stone-500 font-bold hover:text-stone-300">Editar</button><button onClick={() => borrarHabitoManual(h.id)} className="text-rose-500 font-bold hover:text-rose-400">Borrar</button></td></tr>))}</tbody></table></div>
            </section>
          </div>
        )}

        {/* MODALES COMPLETOS */}
        
        {/* MODAL RUTINA VISUAL (LA IMAGEN) */}
        {modalRutinaAbierto && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={() => setModalRutinaAbierto(false)}>
            <div className="relative max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-stone-800" onClick={e => e.stopPropagation()}>
              <button onClick={() => setModalRutinaAbierto(false)} className="absolute top-3 right-3 bg-stone-900/80 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold z-10 hover:bg-rose-500 transition border border-stone-700">✕</button>
              <img src="/rutina.png" alt="Mi Rutina Diaria" className="w-full h-auto block" />
            </div>
          </div>
        )}

        {/* MODAL FINANZAS */}
        {modalAbierto && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-stone-900 w-full max-w-md rounded-2xl shadow-2xl border border-stone-700 overflow-hidden p-5 md:p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-stone-800 pb-3"><h3 className="font-semibold text-base text-stone-100">{formId ? 'Editar Transacción' : 'Registrar Transacción'}</h3><button onClick={() => setModalAbierto(false)} className="text-stone-500 text-lg">×</button></div>
              <form onSubmit={manejarEnvioFormulario} className="space-y-4 text-xs">
                <div><div className="flex bg-stone-950 p-1 rounded-lg border border-stone-800"><button type="button" onClick={() => setFormTipo('Gasto')} className={`flex-1 py-2 rounded-md font-bold transition ${formTipo === 'Gasto' ? 'bg-stone-800 text-stone-100' : 'text-stone-500'}`}>Gasto</button><button type="button" onClick={() => setFormTipo('Ingreso')} className={`flex-1 py-2 rounded-md font-bold transition ${formTipo === 'Ingreso' ? 'bg-stone-800 text-stone-100' : 'text-stone-500'}`}>Ingreso</button></div></div>
                {formTipo === 'Gasto' && (
                  <>
                    <div className="flex bg-stone-950 p-1 rounded-lg border border-stone-800"><button type="button" onClick={() => setFormSubTipo('Necesario')} className={`flex-1 py-2 rounded-md font-bold transition ${formSubTipo === 'Necesario' ? 'bg-stone-200 text-stone-900' : 'text-stone-500'}`}>Necesario</button><button type="button" onClick={() => setFormSubTipo('Innecesario')} className={`flex-1 py-2 rounded-md font-bold transition ${formSubTipo === 'Innecesario' ? 'bg-rose-600 text-white' : 'text-stone-500'}`}>Innecesario</button></div>
                    <select required value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)} className="w-full bg-stone-950 border border-stone-800 p-3 md:p-4 rounded-xl text-stone-200 outline-none focus:border-stone-600 transition cursor-pointer text-sm">
                      {Object.entries(MAPA_CATEGORIAS).map(([catMayor, subCategorias]) => (<optgroup label={catMayor} key={catMayor} className="bg-stone-900 text-stone-400 font-bold">{subCategorias.map(sc => (<option value={sc} key={sc} className="text-stone-200 font-medium">{sc}</option>))}</optgroup>))}
                    </select>
                  </>
                )}
                <input type="number" required value={formMonto} onChange={(e) => setFormMonto(e.target.value)} placeholder="Importe ($ ARS)" className="w-full bg-stone-950 border border-stone-800 p-3 md:p-4 rounded-xl font-medium text-stone-200 outline-none text-sm placeholder:text-stone-700" />
                <input type="text" value={formAplicacion} onChange={(e) => setFormAplicacion(e.target.value)} placeholder="App (Mercado Pago, Efectivo)" className="w-full bg-stone-950 border border-stone-800 p-3 md:p-4 rounded-xl text-stone-200 outline-none text-sm placeholder:text-stone-700" />
                <input type="date" required value={formFecha} onChange={(e) => setFormFecha(e.target.value)} className="w-full bg-stone-950 border border-stone-800 p-3 md:p-4 rounded-xl text-stone-200 outline-none text-sm [color-scheme:dark]" />
                <div className="flex gap-3 pt-2"><button type="button" onClick={() => setModalAbierto(false)} className="flex-1 bg-stone-950 text-stone-400 border border-stone-800 py-3 rounded-xl font-bold">Cancelar</button><button type="submit" className="flex-1 bg-stone-100 text-stone-950 py-3 rounded-xl font-bold">Guardar</button></div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL HÁBITOS MANUAL */}
        {modalHabitoManual && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-stone-900 w-full max-w-sm rounded-2xl shadow-2xl border border-stone-700 overflow-hidden p-5 md:p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-stone-800 pb-3"><h3 className="font-semibold text-base text-stone-100">{formHabitoManual.id ? 'Editar Día' : 'Registrar Día'}</h3><button onClick={() => setModalHabitoManual(false)} className="text-stone-500 text-lg">×</button></div>
              <form onSubmit={manejarEnvioHabitoManual} className="space-y-4 text-xs">
                <input type="date" required value={formHabitoManual.fecha} onChange={(e) => handleFechaHabitoChange(e.target.value)} className="w-full bg-stone-950 border border-stone-800 p-3 md:p-4 rounded-xl text-stone-200 text-sm [color-scheme:dark] outline-none" />
                <div className="space-y-2">
                  {['Entrenamiento', 'Nutrición', 'Abstinencia', 'Auditoría', 'Estudio'].map(pilar => (
                    <div key={pilar} className="flex items-center justify-between p-3 border border-stone-800 rounded-xl bg-stone-950/50">
                      <span className="text-xs font-bold text-stone-200">{pilar}</span>
                      <select value={formHabitoManual[pilar]} onChange={(e) => setFormHabitoManual({...formHabitoManual, [pilar]: e.target.value})} className="bg-stone-900 border border-stone-700 text-stone-200 text-xs p-2 rounded outline-none font-bold cursor-pointer"><option value="cumplido">SÍ</option><option value="nocumplido">NO</option><option value="descanso">DESCANSO</option></select>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-2"><button type="button" onClick={() => setModalHabitoManual(false)} className="flex-1 bg-stone-950 text-stone-400 border border-stone-800 py-3 rounded-xl font-bold">Cancelar</button><button type="submit" className="flex-1 bg-stone-100 text-stone-950 py-3 rounded-xl font-bold">Guardar</button></div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL AGENDA */}
        {modalAgendaAbierto && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-stone-900 w-full max-w-md rounded-2xl shadow-2xl border border-stone-700 overflow-hidden p-5 md:p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                <h3 className="font-semibold text-base text-stone-100">{eventoEdit.id ? 'Editar Evento' : `Nuevo Evento - Día ${diaAgendaSeleccionado}`}</h3>
                <button onClick={() => setModalAgendaAbierto(false)} className="text-stone-500 text-lg">×</button>
              </div>
              <form onSubmit={guardarEventoAgenda} className="space-y-4 text-xs">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] text-stone-500 mb-1 font-bold uppercase tracking-wider">Hora Inicio</label>
                    <input type="time" required value={eventoEdit.horaInicio} onChange={e => setEventoEdit({...eventoEdit, horaInicio: e.target.value})} className="w-full bg-stone-950 border border-stone-800 p-3 rounded-xl text-stone-200 [color-scheme:dark] outline-none focus:border-emerald-500 transition" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] text-stone-500 mb-1 font-bold uppercase tracking-wider">Hora Fin</label>
                    <input type="time" required value={eventoEdit.horaFin} onChange={e => setEventoEdit({...eventoEdit, horaFin: e.target.value})} className="w-full bg-stone-950 border border-stone-800 p-3 rounded-xl text-stone-200 [color-scheme:dark] outline-none focus:border-emerald-500 transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-stone-500 mb-1 font-bold uppercase tracking-wider">Título del Evento</label>
                  <input type="text" required value={eventoEdit.titulo} onChange={e => setEventoEdit({...eventoEdit, titulo: e.target.value})} placeholder="Ej: Gimnasio, TUP, Trabajo" className="w-full bg-stone-950 border border-stone-800 p-3 rounded-xl text-stone-200 outline-none focus:border-emerald-500 transition" />
                </div>
                <div>
                  <label className="block text-[10px] text-stone-500 mb-1 font-bold uppercase tracking-wider">Tipo de Evento</label>
                  <select value={eventoEdit.tipo} onChange={e => setEventoEdit({...eventoEdit, tipo: e.target.value})} className="w-full bg-stone-950 border border-stone-800 p-3 rounded-xl text-stone-200 outline-none cursor-pointer focus:border-emerald-500 transition">
                    <option value="Obligacion">Obligación</option>
                    <option value="Estudio">Estudio</option>
                    <option value="Salud">Salud</option>
                    <option value="Rutina">Rutina</option>
                    <option value="Ocio">Ocio</option>
                    <option value="Auditoria">Auditoría</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalAgendaAbierto(false)} className="flex-1 bg-stone-950 text-stone-400 border border-stone-800 py-3 rounded-xl font-bold hover:bg-stone-800 transition">Cancelar</button>
                  <button type="submit" className="flex-1 bg-stone-100 text-stone-950 py-3 rounded-xl font-bold hover:bg-white transition">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL ESTUDIO */}
        {modalEstudioAbierto && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-stone-900 w-full max-w-md rounded-2xl shadow-2xl border border-stone-700 overflow-hidden p-5 md:p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                <h3 className="font-semibold text-base text-stone-100">{formEstudio.id ? 'Editar Tema' : 'Programar Tema'}</h3>
                <button onClick={() => setModalEstudioAbierto(false)} className="text-stone-500 text-lg">×</button>
              </div>
              <form onSubmit={guardarEstudio} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] text-stone-500 mb-1 font-bold uppercase tracking-wider">Fecha de Estudio</label>
                  <input type="date" required value={formEstudio.fecha} onChange={e => setFormEstudio({...formEstudio, fecha: e.target.value})} className="w-full bg-stone-950 border border-stone-800 p-3 rounded-xl text-stone-200 [color-scheme:dark] outline-none focus:border-blue-500 transition" />
                </div>
                <div>
                  <label className="block text-[10px] text-stone-500 mb-1 font-bold uppercase tracking-wider">Materia o Tema Específico</label>
                  <input type="text" required value={formEstudio.materia} onChange={e => setFormEstudio({...formEstudio, materia: e.target.value})} placeholder="Ej: Lógica de Programación, Base de Datos" className="w-full bg-stone-950 border border-stone-800 p-3 rounded-xl text-stone-200 outline-none focus:border-blue-500 transition" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalEstudioAbierto(false)} className="flex-1 bg-stone-950 text-stone-400 border border-stone-800 py-3 rounded-xl font-bold hover:bg-stone-800 transition">Cancelar</button>
                  <button type="submit" className="flex-1 bg-stone-100 text-stone-950 py-3 rounded-xl font-bold hover:bg-white transition">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}