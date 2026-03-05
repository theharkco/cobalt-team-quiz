import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerAnswerInput from '../PlayerAnswerInput';
import type { QuizQuestion } from '@/data/questions';

const mcQuestion: QuizQuestion = {
  id: 1,
  type: 'multiple-choice',
  question: 'Test?',
  options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
  correctAnswer: 'Beta',
};

const freeTextQuestion: QuizQuestion = {
  id: 2,
  type: 'free-text',
  question: 'What is it?',
  correctAnswer: 'Answer',
};

describe('PlayerAnswerInput', () => {
  it('shows submitted state when disabled', () => {
    render(<PlayerAnswerInput question={mcQuestion} onSubmit={vi.fn()} disabled />);
    expect(screen.getByText('Answer submitted!')).toBeInTheDocument();
  });

  it('renders multiple choice options', () => {
    render(<PlayerAnswerInput question={mcQuestion} onSubmit={vi.fn()} disabled={false} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Delta')).toBeInTheDocument();
  });

  it('calls onSubmit when option clicked', () => {
    const onSubmit = vi.fn();
    render(<PlayerAnswerInput question={mcQuestion} onSubmit={onSubmit} disabled={false} />);
    fireEvent.click(screen.getByText('Beta'));
    expect(onSubmit).toHaveBeenCalledWith('Beta');
  });

  it('renders text input for free-text questions', () => {
    render(<PlayerAnswerInput question={freeTextQuestion} onSubmit={vi.fn()} disabled={false} />);
    expect(screen.getByPlaceholderText('Type your answer...')).toBeInTheDocument();
    expect(screen.getByText('Submit Answer 🚀')).toBeInTheDocument();
  });

  it('submit button disabled when text is empty', () => {
    render(<PlayerAnswerInput question={freeTextQuestion} onSubmit={vi.fn()} disabled={false} />);
    const btn = screen.getByText('Submit Answer 🚀');
    expect(btn).toBeDisabled();
  });

  it('calls onSubmit on button click with trimmed text', () => {
    const onSubmit = vi.fn();
    render(<PlayerAnswerInput question={freeTextQuestion} onSubmit={onSubmit} disabled={false} />);
    const input = screen.getByPlaceholderText('Type your answer...');
    fireEvent.change(input, { target: { value: '  hello  ' } });
    fireEvent.click(screen.getByText('Submit Answer 🚀'));
    expect(onSubmit).toHaveBeenCalledWith('hello');
  });

  it('calls onSubmit on Enter key with text', () => {
    const onSubmit = vi.fn();
    render(<PlayerAnswerInput question={freeTextQuestion} onSubmit={onSubmit} disabled={false} />);
    const input = screen.getByPlaceholderText('Type your answer...');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('test');
  });

  it('does not submit on Enter when text is empty', () => {
    const onSubmit = vi.fn();
    render(<PlayerAnswerInput question={freeTextQuestion} onSubmit={onSubmit} disabled={false} />);
    const input = screen.getByPlaceholderText('Type your answer...');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders music question as multiple choice', () => {
    const musicQ: QuizQuestion = {
      id: 3,
      type: 'music',
      question: 'Who sings?',
      options: ['A', 'B'],
      correctAnswer: 'A',
    };
    render(<PlayerAnswerInput question={musicQ} onSubmit={vi.fn()} disabled={false} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
