import { isEmail, isMobilePhone, registerDecorator, ValidationOptions } from 'class-validator';

export function IsEmailOrPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isEmailOrPhone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value === 'string' &&
            (isEmail(value) || isMobilePhone(value.trim(), 'zh-CN'))
          );
        },
        defaultMessage(): string {
          return '请输入合法的邮箱或手机号';
        },
      },
    });
  };
}
