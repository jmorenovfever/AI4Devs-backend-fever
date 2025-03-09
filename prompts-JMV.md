# Prompt 1

Eres un experto ingeniero de Backend y se te pide la siguiente tarea:  Tu misión en este ejercicio es crear dos nuevos endpoints que nos permitirán manipular la lista de candidatos de una aplicación en una interfaz tipo kanban.  GET /positions/:id/candidates Este endpoint recogerá todos los candidatos en proceso para una determinada posición, es decir, todas las aplicaciones para un determinado positionID. Debe proporcionar la siguiente información básica:  
Nombre completo del candidato (de la tabla candidate).
current_interview_step: en qué fase del proceso está el candidato (de la tabla application).
La puntuación media del candidato. Recuerda que cada entrevist (interview) realizada por el candidato tiene un score
PUT /candidates/:id/stage Este endpoint actualizará la etapa del candidato movido. Permite modificar la fase actual del proceso de entrevista en la que se encuentra un candidato específico.

Utiliza como contexto el archivo README.md. El proyecto además sigue DDD y principios SOLID, todas tus propuestas deben de seguir esto también.  Antes de modificar nada hazme las preguntas que consideres oportunas.

## Respuesta 1
Para asegurarme de que entiendo correctamente los requisitos y el contexto del proyecto, tengo algunas preguntas:

1. ¿Podrías confirmar la estructura de las tablas `candidate`, `application`, y `interview` en la base de datos? Esto me ayudará a entender cómo están relacionadas y qué campos están disponibles.
2. ¿Hay algún middleware o servicio existente que maneje la autenticación y autorización que deba tener en cuenta para estos endpoints?
3. ¿Existen ya servicios o repositorios que manejen la lógica de negocio para `candidate`, `application`, y `interview` que pueda reutilizar?
4. ¿Hay algún formato específico para la respuesta JSON que deba seguir para el endpoint `GET /positions/:id/candidates`?
5. ¿Debo considerar alguna validación o manejo de errores específico para el endpoint `PUT /candidates/:id/stage`?

Con esta información, podré asegurarme de que las implementaciones sigan los principios de DDD y SOLID, y se integren correctamente con el resto del proyecto.

# Prompt 2
1. La estructura de las tablas la puedes ver en el archivo schema.prisma
2. No tenemos autenticación ni autorizacion en este proyecto
3. Tienes en el archivo candidateService.ts el repositorio para candidate
4. Un JSON con un array de objetos los 3 campos que se te piden
5. Si, puedes añadir control de errores cuando se le pasan valores incorrectos devolviendo un 400 y si se le pasan datos que no encuentra un 404

## Respuesta 2
Para implementar los endpoints solicitados, seguiré los principios de DDD y SOLID. Aquí tienes el código para los dos endpoints:

1. **GET /positions/:id/candidates**: Este endpoint recogerá todos los candidatos en proceso para una determinada posición.

2. **PUT /candidates/:id/stage**: Este endpoint actualizará la etapa del candidato movido.

### GET /positions/:id/candidates

```typescript
import { Request, Response } from 'express';
import { Candidate } from '../domain/models/Candidate';
import { Application } from '../domain/models/Application';

export const getCandidatesByPosition = async (req: Request, res: Response) => {
    const positionId = parseInt(req.params.id);

    if (isNaN(positionId)) {
        return res.status(400).json({ error: 'Invalid position ID' });
    }

    try {
        const applications = await Application.findMany({
            where: { positionId },
            include: {
                candidate: true,
                interviews: true,
            },
        });

        const candidates = applications.map(app => ({
            fullName: `${app.candidate.firstName} ${app.candidate.lastName}`,
            current_interview_step: app.currentInterviewStep,
            average_score: app.interviews.reduce((acc, interview) => acc + interview.score, 0) / app.interviews.length,
        }));

        res.json(candidates);
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
```

### PUT /candidates/:id/stage

```typescript
import { Request, Response } from 'express';
import { Application } from '../domain/models/Application';

export const updateCandidateStage = async (req: Request, res: Response) => {
    const candidateId = parseInt(req.params.id);
    const { currentInterviewStep } = req.body;

    if (isNaN(candidateId) || typeof currentInterviewStep !== 'number') {
        return res.status(400).json({ error: 'Invalid candidate ID or interview step' });
    }

    try {
        const application = await Application.findOne({ where: { candidateId } });

        if (!application) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        application.currentInterviewStep = currentInterviewStep;
        await application.save();

        res.json({ message: 'Candidate stage updated successfully' });
    } catch (error) {
        console.error('Error updating candidate stage:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
```

### Integración en el Router

Asegúrate de integrar estos controladores en tu router de Express:

```typescript
import express from 'express';
import { getCandidatesByPosition, updateCandidateStage } from './controllers/candidateController';

const router = express.Router();

router.get('/positions/:id/candidates', getCandidatesByPosition);
router.put('/candidates/:id/stage', updateCandidateStage);

export default router;
```

Estos cambios deberían cumplir con los requisitos y seguir los principios de DDD y SOLID.


# Prompt 3
Tu propuesta de endpoints no es correcta ya que está llamando a dominio directamente sin hacer uso de la capa de servicio o repositorio. El controlador debe llamar a un servicio y este sea el responsable de acceder a los datos de dominio.

## Respuesta 3
Entendido. Vamos a modificar los controladores para que utilicen la capa de servicio en lugar de acceder directamente a los modelos de dominio.

### Servicio para manejar candidatos

Primero, crearemos un servicio para manejar la lógica de negocio de los candidatos.

```typescript
// backend/src/application/services/candidateService.ts
import { Application } from '../../domain/models/Application';
import { Candidate } from '../../domain/models/Candidate';

export const getCandidatesByPosition = async (positionId: number) => {
    const applications = await Application.findMany({
        where: { positionId },
        include: {
            candidate: true,
            interviews: true,
        },
    });

    return applications.map(app => ({
        fullName: `${app.candidate.firstName} ${app.candidate.lastName}`,
        current_interview_step: app.currentInterviewStep,
        average_score: app.interviews.reduce((acc, interview) => acc + interview.score, 0) / app.interviews.length,
    }));
};

export const updateCandidateStage = async (candidateId: number, currentInterviewStep: number) => {
    const application = await Application.findOne({ where: { candidateId } });

    if (!application) {
        throw new Error('Candidate not found');
    }

    application.currentInterviewStep = currentInterviewStep;
    await application.save();

    return application;
};
```

### Controladores para los endpoints

Luego, actualizaremos los controladores para que utilicen el servicio.

```typescript
// backend/src/presentation/controllers/candidateController.ts
import { Request, Response } from 'express';
import { getCandidatesByPosition, updateCandidateStage } from '../../application/services/candidateService';

export const getCandidatesByPositionController = async (req: Request, res: Response) => {
    const positionId = parseInt(req.params.id);

    if (isNaN(positionId)) {
        return res.status(400).json({ error: 'Invalid position ID' });
    }

    try {
        const candidates = await getCandidatesByPosition(positionId);
        res.json(candidates);
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateCandidateStageController = async (req: Request, res: Response) => {
    const candidateId = parseInt(req.params.id);
    const { currentInterviewStep } = req.body;

    if (isNaN(candidateId) || typeof currentInterviewStep !== 'number') {
        return res.status(400).json({ error: 'Invalid candidate ID or interview step' });
    }

    try {
        const application = await updateCandidateStage(candidateId, currentInterviewStep);
        res.json({ message: 'Candidate stage updated successfully', application });
    } catch (error) {
        if (error.message === 'Candidate not found') {
            return res.status(404).json({ error: 'Candidate not found' });
        }
        console.error('Error updating candidate stage:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
```

### Integración en el Router

Finalmente, integramos estos controladores en el router de Express.

```typescript
// backend/src/presentation/routes/candidateRoutes.ts
import express from 'express';
import { getCandidatesByPositionController, updateCandidateStageController } from '../controllers/candidateController';

const router = express.Router();

router.get('/positions/:id/candidates', getCandidatesByPositionController);
router.put('/candidates/:id/stage', updateCandidateStageController);

export default router;
```