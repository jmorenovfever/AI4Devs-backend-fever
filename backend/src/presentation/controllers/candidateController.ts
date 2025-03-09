import { Request, Response } from 'express';
import {
    addCandidate,
    findCandidateById,
    getCandidatesByPosition,
    updateCandidateStage
} from '../../application/services/candidateService';

export const addCandidateController = async (req: Request, res: Response) => {
    try {
        const candidateData = req.body;
        const candidate = await addCandidate(candidateData);
        res.status(201).json({ message: 'Candidate added successfully', data: candidate });
    } catch (error: unknown) {
        if (error instanceof Error) {
            res.status(400).json({ message: 'Error adding candidate', error: error.message });
        } else {
            res.status(400).json({ message: 'Error adding candidate', error: 'Unknown error' });
        }
    }
};

export const getCandidateById = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }
        const candidate = await findCandidateById(id);
        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }
        res.json(candidate);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

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

export { addCandidate };