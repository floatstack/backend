import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../../utils/response.js';
import { AuthService } from '../service/authService.js';
import { UserRequest } from '../../../middleware/validationMiddleware.js';


export const login = async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.payload;
    const result = await AuthService.login(email, password);
    return res.status(200).json(successResponse(200, 'Login successful', result));
  } catch (error: any) {
    return res
      .status(error.statusCode || 500)
      .json(errorResponse(error.statusCode || 500, error.message, error.errors || []));
  }

};