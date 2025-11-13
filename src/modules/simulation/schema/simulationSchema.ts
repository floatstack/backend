import Joi from 'joi';

export const simulateTransactionSchema = Joi.object({
    agent_id: Joi.string().min(1).required(),
    amount: Joi.number().positive().required(),
    balance_after: Joi.number().min(0).required(),
    tx_type: Joi.string().valid('withdrawal', 'deposit').default('withdrawal')
});
