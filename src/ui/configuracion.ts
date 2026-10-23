import { app, type Pantalla } from '../app';
import { audio } from '../audio';
import { DIFICULTADES, nombreDificultad, type Dificultad } from '../core/difficulty';
import { crearPartida, type Cantidad } from '../core/partida';
import { CATEGORIAS, type Categoria } from '../content/quiz';
import { entrarPantallaCompleta, salirPantallaCompleta } from '../fullscreen';
import type { Configuracion } from '../storage';
import { boton, h } from './dom';
import { opcionesSinConexion } from './sinconexion';

const CANTIDADES: Cantidad[] = [10, 15, 20, 'ilimitada'];
const TEMAS: Configuracion['tema'][] = ['claro', 'oscuro', 'auto'];
const NOMBRE_TEMA: Record<Configuracion['tema'], string> = { claro: 'Claro', oscuro: 'Oscuro', auto: 'Auto' };

export function pantallaConfiguracion(): Pantalla {
  let categoria: Categoria = 'Todas';
  let dificultad: Dificultad = 'facil';
  let cantidad: Cantidad = 10;

  const grupoOpciones = <T>(etiqueta: string, valores: readonly T[], actual: T, texto: (v: T) => string, onElegir: (v: T) => void) => {
    const fila = h('div', { class: 'fila-botones', role: 'group', 'aria-label': etiqueta });
    const botones = valores.map((v) =>
      boton(texto(v), () => {
        onElegir(v);
        botones.forEach((b, i) => b.setAttribute('aria-pressed', String(valores[i] === v)));
        audio.efecto('boton');
      }, { variante: v === actual ? 'primario' : 'secundario' }),
    );
    botones.forEach((b, i) => b.setAttribute('aria-pressed', String(valores[i] === actual)));
    fila.append(...botones);
    return fila;
  };

  const filaCategoria = grupoOpciones('Categoría', ['Todas', ...CATEGORIAS] as Categoria[], categoria, (v) => v, (v) => (categoria = v));
  const filaDificultad = grupoOpciones('Dificultad', DIFICULTADES, dificultad, nombreDificultad, (v) => (dificultad = v));
  const filaCantidad = grupoOpciones('Cantidad de preguntas', CANTIDADES, cantidad, (v) => (v === 'ilimitada' ? 'Sin límite' : String(v)), (v) => (cantidad = v));

  const botonTema = boton(`Tema: ${NOMBRE_TEMA[app.g.config.tema]}`, () => {
    const i = TEMAS.indexOf(app.g.config.tema);
    app.g.config.tema = TEMAS[(i + 1) % TEMAS.length];
    app.guardar();
    app.aplicarConfig();
    botonTema.querySelector('.btn-texto')!.textContent = `Tema: ${NOMBRE_TEMA[app.g.config.tema]}`;
    audio.efecto('boton');
  }, { variante: 'suave', icono: '🌓' });

  const textoPantalla = () => `Pantalla completa: ${app.g.config.pantallaCompleta ? 'Sí' : 'No'}`;
  const botonPantalla = boton(textoPantalla(), () => {
    app.g.config.pantallaCompleta = !app.g.config.pantallaCompleta;
    app.guardar();
    (app.g.config.pantallaCompleta ? entrarPantallaCompleta : salirPantallaCompleta)();
    botonPantalla.querySelector('.btn-texto')!.textContent = textoPantalla();
    audio.efecto('boton');
  }, { variante: 'suave', icono: '⛶' });

  const jugar = () => {
    audio.efecto('boton');
    const partida = crearPartida({ categoria, dificultad, cantidad });
    if (partida.preguntas.length === 0) {
      alerta.textContent = 'No hay preguntas suficientes para esa combinación. Prueba con otra categoría o dificultad.';
      return;
    }
    app.ir('juego', { partida });
  };

  const alerta = h('p', { class: 'error-campo', 'aria-live': 'polite' });

  const el = h(
    'main',
    { class: 'pantalla configuracion' },
    h(
      'div',
      { class: 'tarjeta pila' },
      h('h1', { text: `¡Hola, ${app.nombre()}!` }),
      h('p', { class: 'texto-suave', text: 'Elige la categoría, la dificultad y cuántas preguntas quieres responder.' }),
      h('div', { class: 'campo' }, h('span', { class: 'etiqueta', text: 'Categoría' }), filaCategoria),
      h('div', { class: 'campo' }, h('span', { class: 'etiqueta', text: 'Dificultad' }), filaDificultad),
      h('div', { class: 'campo' }, h('span', { class: 'etiqueta', text: 'Cantidad de preguntas' }), filaCantidad),
      alerta,
      h('button', { type: 'button', class: 'btn btn-primario btn-grande', onclick: jugar }, h('span', { class: 'btn-texto', text: 'Jugar' })),
      h('div', { class: 'fila-botones' },
        boton('Ver tabla de puntuaciones', () => app.ir('puntuaciones'), { variante: 'suave' }),
        botonTema,
        botonPantalla,
      ),
      opcionesSinConexion(),
    ),
  );
  return { el };
}
