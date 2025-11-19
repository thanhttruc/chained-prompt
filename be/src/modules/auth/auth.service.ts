import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../user/user.entity';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    // Tìm người dùng theo email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    // Kiểm tra người dùng có tồn tại không
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }

    // So sánh mật khẩu với hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    }

    // Tạo JWT token
    const payload = { sub: user.userId, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    // Trả về accessToken và thông tin người dùng
    return {
      accessToken,
      user: {
        id: user.userId,
        fullName: user.fullName,
        email: user.email,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { fullName, email, password, confirmPassword } = registerDto;

    // Kiểm tra password và confirmPassword có trùng khớp không
    if (password !== confirmPassword) {
      throw new BadRequestException({ error: 'Passwords do not match.' });
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException({ error: 'This email is already registered.' });
    }

    // Hash mật khẩu
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Tạo username từ email (lấy phần trước @)
    let username = email.split('@')[0];
    let usernameCounter = 1;
    
    // Kiểm tra và tạo username unique nếu cần
    let existingUsername = await this.userRepository.findOne({
      where: { username },
    });
    
    while (existingUsername) {
      username = `${email.split('@')[0]}${usernameCounter}`;
      existingUsername = await this.userRepository.findOne({
        where: { username },
      });
      usernameCounter++;
    }

    // Tạo user mới
    const newUser = this.userRepository.create({
      fullName,
      email,
      username,
      password: hashedPassword,
      totalBalance: 0,
    });

    const savedUser = await this.userRepository.save(newUser);

    // Tạo JWT token
    const payload = { sub: savedUser.userId, email: savedUser.email };
    const accessToken = this.jwtService.sign(payload);

    // Trả về thông tin người dùng và token
    return {
      message: 'Registration successful',
      user: {
        id: savedUser.userId,
        fullName: savedUser.fullName,
        email: savedUser.email,
      },
      token: accessToken,
    };
  }
}

